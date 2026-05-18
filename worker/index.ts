/**
 * Letmefree — Gemini API 백엔드 프록시 (Cloudflare Worker)
 *
 * 아키텍처:
 *   프로덕션 기본 = Vertex AI 경로 (us-central1-aiplatform.googleapis.com).
 *   → 국가 차단(FAILED_PRECONDITION) 없음. 서비스 계정 OAuth 토큰으로 인증.
 *   폴백 = Gemini Developer API (generativelanguage.googleapis.com).
 *   → USE_VERTEX="false" 로 설정 시 활성화 (롤백 전용).
 *
 * 배포:
 *   cd worker && npx wrangler deploy
 *   # Vertex AI (프로덕션 필수)
 *   npx wrangler secret put VERTEX_SA_JSON       # GCP 서비스 계정 JSON 전체
 *   # 폴백/개발용
 *   npx wrangler secret put GEMINI_API_KEY
 *   # 공통
 *   npx wrangler secret put SUPABASE_JWT_SECRET
 *   npx wrangler secret put SUPABASE_SERVICE_KEY
 *   npx wrangler secret put STRIPE_SECRET_KEY
 *   npx wrangler secret put STRIPE_WEBHOOK_SECRET
 *   npx wrangler secret put PORTONE_API_SECRET
 *
 *   wrangler.toml [vars] 에 GCP_PROJECT_ID, VERTEX_LOCATION 설정 필수.
 */

const GOOGLE_AI_BASE = 'https://generativelanguage.googleapis.com';
const GOOGLE_AI_WS   = 'wss://generativelanguage.googleapis.com';

// Vertex AI — generativelanguage.googleapis.com 의 국가 차단(FAILED_PRECONDITION) 해결용
// 서비스 계정 OAuth 로 인증하며 호출원 IP 국가 제한이 없음.
const VERTEX_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const VERTEX_SCOPE           = 'https://www.googleapis.com/auth/cloud-platform';

export interface Env {
  GEMINI_API_KEY: string;
  GEMINI_KEY_V2?: string;
  ALLOWED_ORIGIN: string;
  SUPABASE_JWT_SECRET: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  // Stripe 플랜별 priceId (서버측 맵핑으로 클라이언트 조작 차단)
  STRIPE_PRICE_PRO?: string;
  STRIPE_PRICE_ULTRA?: string;
  PORTONE_API_SECRET?: string;
  RATE_LIMIT?: KVNamespace;

  // Vertex AI (국가 차단 해제 경로)
  GCP_PROJECT_ID?: string;
  VERTEX_LOCATION?: string;       // 예: "us-central1"
  VERTEX_SA_JSON?: string;        // Service Account JSON 전체 (wrangler secret put VERTEX_SA_JSON)
  USE_VERTEX?: string;            // "false" 로 설정 시 기존 Developer API 경로로 폴백
}

// ────────────────────────────────────────────────────────────────
// JWT 검증
// ────────────────────────────────────────────────────────────────
async function verifyAuth(request: Request, env: Env): Promise<{
  valid: boolean;
  userId?: string;
  plan?: string;
  error?: string;
}> {
  // Authorization 헤더 또는 x-goog-api-key 헤더에서 JWT 추출
  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('x-goog-api-key');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (apiKeyHeader && apiKeyHeader.includes('.')) {
    token = apiKeyHeader;
  }

  if (!token) {
    return { valid: false, error: 'Missing Authorization header' };
  }

  // JWT Secret 미설정 시 서버 설정 오류로 거부
  if (!env.SUPABASE_JWT_SECRET) {
    return { valid: false, error: 'Server misconfiguration: JWT secret not set' };
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Invalid token format' };

    // alg 헤더 엄격 검증 (alg="none" 공격 및 알고리즘 혼동 차단)
    let header: { alg?: string; typ?: string };
    try {
      header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return { valid: false, error: 'Invalid token header' };
    }
    if (header.alg !== 'HS256') {
      return { valid: false, error: `Unsupported alg: ${header.alg}` };
    }

    // HMAC-SHA256 서명 검증
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(env.SUPABASE_JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureInput = encoder.encode(`${parts[0]}.${parts[1]}`);
    const signature = base64UrlDecode(parts[2]);
    const isValid = await crypto.subtle.verify('HMAC', key, signature, signatureInput);

    if (!isValid) {
      return { valid: false, error: 'Invalid token signature' };
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // 만료 확인
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token expired' };
    }

    // issuer 검증: Supabase는 legacy(iss="supabase")와 URL 기반(iss="${URL}/auth/v1")
    // 두 형식을 혼용 중 — 두 형식 모두 허용하되, ref 클레임으로 프로젝트 격리 강제
    const expectedUrlIss = env.SUPABASE_URL ? `${env.SUPABASE_URL}/auth/v1` : null;
    const isLegacyIss = payload.iss === 'supabase';
    const isUrlIss = expectedUrlIss && payload.iss === expectedUrlIss;
    if (!isLegacyIss && !isUrlIss) {
      return { valid: false, error: 'Invalid token issuer' };
    }

    // project ref 검증 (핵심 프로젝트 격리 — 다른 Supabase 프로젝트 토큰 차단)
    if (env.SUPABASE_URL) {
      try {
        const expectedRef = new URL(env.SUPABASE_URL).hostname.split('.')[0];
        if (payload.ref && payload.ref !== expectedRef) {
          return { valid: false, error: 'Invalid token project ref' };
        }
      } catch {
        // URL 파싱 실패는 서버 설정 문제 — 무시
      }
    }

    // audience 검증 (Supabase 표준: 'authenticated'; anon key는 aud 없을 수 있음)
    // user JWT는 반드시 'authenticated' 이어야 함
    if (payload.aud && payload.aud !== 'authenticated') {
      return { valid: false, error: 'Invalid token audience' };
    }

    return {
      valid: true,
      userId: payload.sub,
      plan: payload.user_metadata?.plan || 'free',
    };
  } catch {
    return { valid: false, error: 'Token verification failed' };
  }
}

function base64UrlDecode(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ────────────────────────────────────────────────────────────────
// Vertex AI — OAuth2 access token (서비스 계정 JWT → access_token 교환)
// 호출원 IP 국가 제한이 없는 `{region}-aiplatform.googleapis.com` 엔드포인트 사용.
// ────────────────────────────────────────────────────────────────
interface VertexServiceAccount {
  client_email: string;
  private_key: string;  // PEM (PKCS#8)
  project_id?: string;
  token_uri?: string;
}

// 모듈 스코프 캐시 — 같은 Worker 인스턴스의 연속 요청에 재사용 (최대 ~1h)
let cachedVertexToken: { token: string; exp: number } | null = null;
let cachedVertexSA: VertexServiceAccount | null = null;

function b64UrlEncodeString(s: string): string {
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function parseServiceAccount(env: Env): VertexServiceAccount | null {
  if (cachedVertexSA) return cachedVertexSA;
  if (!env.VERTEX_SA_JSON) return null;
  try {
    const sa = JSON.parse(env.VERTEX_SA_JSON) as VertexServiceAccount;
    if (!sa.client_email || !sa.private_key) return null;
    // private_key 는 JSON 이스케이프 (\n) 형태로 저장되는 경우가 많음
    sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    cachedVertexSA = sa;
    return sa;
  } catch {
    return null;
  }
}

async function getVertexAccessToken(env: Env): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);

  // 만료 60초 전까지는 캐시 재사용
  if (cachedVertexToken && cachedVertexToken.exp > now + 60) {
    return cachedVertexToken.token;
  }

  const sa = parseServiceAccount(env);
  if (!sa) return null;

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: VERTEX_SCOPE,
    aud: sa.token_uri || VERTEX_OAUTH_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const signingInput = `${b64UrlEncodeString(JSON.stringify(header))}.${b64UrlEncodeString(JSON.stringify(payload))}`;

  let jwt: string;
  try {
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(sa.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(signingInput)
    );
    jwt = `${signingInput}.${b64UrlEncodeBytes(new Uint8Array(sig))}`;
  } catch (e) {
    console.error('Vertex JWT sign failed:', e);
    return null;
  }

  try {
    const res = await fetch(sa.token_uri || VERTEX_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });
    if (!res.ok) {
      console.error(`Vertex token exchange failed: ${res.status} ${await res.text()}`);
      return null;
    }
    const data = await res.json() as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    cachedVertexToken = {
      token: data.access_token,
      exp: now + (data.expires_in ?? 3600),
    };
    return data.access_token;
  } catch (e) {
    console.error('Vertex token fetch error:', e);
    return null;
  }
}

// SDK 가 보내는 경로 `/v1beta/models/{model}:{method}` 를
// Vertex REST 경로 `/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:{method}` 로 재작성.
function rewritePathToVertex(
  path: string,
  projectId: string,
  location: string
): string | null {
  // 선행 `/api/gemini` 는 호출 시점에 이미 제거됨
  const m = path.match(/^\/v1(?:beta|alpha)?\/models\/([^:/]+):([A-Za-z]+)\/?$/);
  if (!m) return null;
  const [, model, method] = m;
  return `/v1/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:${method}`;
}

function vertexEnabled(env: Env): boolean {
  if (env.USE_VERTEX === 'false') return false;
  return !!(env.VERTEX_SA_JSON && env.GCP_PROJECT_ID);
}

// ────────────────────────────────────────────────────────────────
// Rate Limiting (KV 또는 메모리 폴백)
// ────────────────────────────────────────────────────────────────
const RATE_LIMITS: Record<string, number> = {
  guest: 200,  // 게스트: IP당 일 200회 (3개 시나리오 체험 + 신뢰도/코칭 API 포함)
  free: 20,
  pro: 100,
  ultra: 1000,
};

async function checkRateLimit(userId: string, plan: string, env: Env): Promise<boolean> {
  // fail-closed: KV 미바인딩 시 요청 거부 (DoS/크레딧 고갈 방지)
  // Cloudflare Worker는 인스턴스별 메모리 분리 + 수평 확장되므로 메모리 Map은 사실상 무제한
  if (!env.RATE_LIMIT) {
    console.error('RATE_LIMIT KV namespace not bound — rejecting request (fail-closed)');
    return false;
  }

  const key = `rate:${userId}:${new Date().toISOString().slice(0, 10)}`;
  const limit = RATE_LIMITS[plan] || RATE_LIMITS.free;

  const current = parseInt((await env.RATE_LIMIT.get(key)) || '0', 10);
  if (current >= limit) return false;
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 86400 });
  return true;
}

// ────────────────────────────────────────────────────────────────
// Stripe Webhook 서명 검증 (HMAC-SHA256)
// ────────────────────────────────────────────────────────────────
async function verifyStripeSignature(
  body: string, sigHeader: string, secret: string
): Promise<boolean> {
  const parts = sigHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const v1Sig = parts.find(p => p.startsWith('v1='))?.slice(3);

  if (!timestamp || !v1Sig) return false;

  // 5분 이상 지난 이벤트 거부
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const payload = encoder.encode(`${timestamp}.${body}`);
  const signatureBytes = await crypto.subtle.sign('HMAC', key, payload);
  const computedSig = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedSig === v1Sig;
}

// ────────────────────────────────────────────────────────────────
// Supabase Admin API 호출 헬퍼
// ────────────────────────────────────────────────────────────────
async function updateProfilePlan(
  env: Env, stripeCustomerId: string, plan: string
): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    console.error('Supabase admin credentials not configured');
    return;
  }

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?stripe_customer_id=eq.${encodeURIComponent(stripeCustomerId)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ plan, updated_at: new Date().toISOString() }),
    }
  );

  if (!res.ok) {
    console.error(`Profile plan update failed: ${res.status} ${await res.text()}`);
  }
}

// ────────────────────────────────────────────────────────────────
// Stripe Webhook 재생 공격 방어 (event.id 기반 idempotency)
// Supabase에 processed_stripe_events 테이블 필요 (SQL: CREATE TABLE processed_stripe_events (event_id text PRIMARY KEY, event_type text, processed_at timestamptz DEFAULT now()))
// ────────────────────────────────────────────────────────────────
async function isStripeEventProcessed(env: Env, eventId: string): Promise<boolean> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return false;
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/processed_stripe_events?select=event_id&event_id=eq.${encodeURIComponent(eventId)}&limit=1`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (!res.ok) return false;
    const rows = (await res.json()) as Array<{ event_id: string }>;
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function markStripeEventProcessed(env: Env, eventId: string, eventType: string): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/processed_stripe_events`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ event_id: eventId, event_type: eventType }),
    });
  } catch (e) {
    console.error('Failed to mark stripe event processed:', e);
  }
}

// ────────────────────────────────────────────────────────────────
// Stripe Webhook 처리
// ────────────────────────────────────────────────────────────────
async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) {
    return new Response('Stripe not configured', { status: 501 });
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature') || '';

  // 서명 검증 (HMAC-SHA256)
  const isValid = await verifyStripeSignature(body, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    const event = JSON.parse(body);

    // Idempotency: 이미 처리한 event.id 재전송 시 스킵 (재생 공격으로 플랜 강등 방지)
    if (event.id && await isStripeEventProcessed(env, event.id)) {
      return new Response('OK (duplicate)', { status: 200 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // metadata.plan은 클라이언트 주입 가능하므로 화이트리스트 재검증
        const ALLOWED = ['pro', 'ultra'];
        const plan = session.metadata?.plan;
        if (session.customer && plan && ALLOWED.includes(plan)) {
          await updateProfilePlan(env, session.customer, plan);
        } else if (session.customer && plan) {
          console.warn(`Rejected unknown plan in webhook: ${plan}`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        if (subscription.customer) {
          await updateProfilePlan(env, subscription.customer, 'free');
        }
        break;
      }
      case 'invoice.payment_failed': {
        console.log('Payment failed:', event.data.object.customer);
        break;
      }
    }

    // 성공적으로 처리한 이벤트 기록 (다음번 재전송 시 스킵)
    if (event.id) {
      await markStripeEventProcessed(env, event.id, event.type || 'unknown');
    }

    return new Response('OK', { status: 200 });
  } catch {
    return new Response('Webhook processing failed', { status: 400 });
  }
}

// ────────────────────────────────────────────────────────────────
// Stripe Checkout Session 생성
// ────────────────────────────────────────────────────────────────
async function handleCreateCheckout(request: Request, env: Env, auth: { userId?: string }): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 501,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
  }

  const { plan, returnUrl } = await request.json() as {
    plan: string; returnUrl: string;
  };

  // plan 화이트리스트 검증 (클라이언트가 임의 plan 값을 주입하여 상위 플랜 획득 차단)
  const ALLOWED_PLANS = ['pro', 'ultra'] as const;
  if (!plan || !ALLOWED_PLANS.includes(plan as typeof ALLOWED_PLANS[number])) {
    return new Response(JSON.stringify({ error: 'Invalid plan' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
  }

  // priceId 서버측 맵핑 (클라이언트 priceId 조작 차단 — $0 priceId + 상위 plan metadata 공격 방어)
  const PLAN_PRICE_MAP: Record<string, string | undefined> = {
    pro: env.STRIPE_PRICE_PRO,
    ultra: env.STRIPE_PRICE_ULTRA,
  };
  const serverPriceId = PLAN_PRICE_MAP[plan];
  if (!serverPriceId) {
    console.error(`STRIPE_PRICE_${plan.toUpperCase()} secret not configured`);
    return new Response(JSON.stringify({ error: 'Plan not available' }), {
      status: 501,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
  }

  // returnUrl 화이트리스트 검증 (오픈 리다이렉트 방지)
  const allowedOrigin = env.ALLOWED_ORIGIN;
  try {
    if (!allowedOrigin || !returnUrl || new URL(returnUrl).origin !== allowedOrigin) {
      throw new Error('origin mismatch');
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid return URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
  }

  const params = new URLSearchParams({
    'mode': 'subscription',
    'line_items[0][price]': serverPriceId,
    'line_items[0][quantity]': '1',
    'success_url': `${returnUrl}/#/profile?checkout=success`,
    'cancel_url': `${returnUrl}/#/pricing?checkout=cancel`,
    'metadata[plan]': plan,
    'metadata[user_id]': auth.userId || '',
  });

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const data = await res.json() as { url?: string; error?: unknown };
  return new Response(JSON.stringify({ url: data.url }), {
    status: res.ok ? 200 : 400,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
  });
}

// ────────────────────────────────────────────────────────────────
// Stripe Customer Portal (JWT 기반 customerId 조회)
// ────────────────────────────────────────────────────────────────
async function handleCustomerPortal(request: Request, env: Env, auth: { userId?: string }): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 501,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
  }

  const { returnUrl } = await request.json() as { returnUrl: string };

  // returnUrl 화이트리스트 검증 (오픈 리다이렉트 방지)
  const allowedOrigin = env.ALLOWED_ORIGIN;
  try {
    if (!allowedOrigin || !returnUrl || new URL(returnUrl).origin !== allowedOrigin) {
      throw new Error('origin mismatch');
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid return URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
  }

  // JWT userId로 Supabase에서 stripe_customer_id 조회
  let customerId: string | null = null;
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY && auth.userId) {
    const profileRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(auth.userId ?? '')}&select=stripe_customer_id`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    const profiles = await profileRes.json() as Array<{ stripe_customer_id?: string }>;
    customerId = profiles?.[0]?.stripe_customer_id || null;
  }

  if (!customerId) {
    return new Response(JSON.stringify({ error: 'No Stripe customer found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
  }

  const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'customer': customerId,
      'return_url': `${returnUrl}/#/profile`,
    }),
  });

  const data = await res.json() as { url?: string; error?: unknown };
  return new Response(JSON.stringify({ url: data.url }), {
    status: res.ok ? 200 : 400,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
  });
}

// ────────────────────────────────────────────────────────────────
// 포트원 결제 검증 + 플랜/리포트 활성화
// ────────────────────────────────────────────────────────────────
async function handleVerifyPayment(
  request: Request, env: Env, auth: { userId?: string }
): Promise<Response> {
  if (!env.PORTONE_API_SECRET || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Payment verification not configured' }), {
      status: 501,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
  }

  const { paymentId, type, plan, days, simulationId, amount } = await request.json() as {
    paymentId: string;
    type: 'plan' | 'report';
    plan?: string;
    days?: number;
    simulationId?: string;
    amount: number;
  };

  // 1. 포트원 API로 결제 상태 검증
  const verifyRes = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    headers: { 'Authorization': `PortOne ${env.PORTONE_API_SECRET}` },
  });

  if (!verifyRes.ok) {
    return new Response(JSON.stringify({ error: '결제 정보를 확인할 수 없습니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
  }

  const payment = await verifyRes.json() as {
    status: string;
    amount?: { total?: number };
  };

  // 결제 상태 확인
  if (payment.status !== 'PAID') {
    return new Response(JSON.stringify({ error: '결제가 완료되지 않았습니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
  }

  // 금액 검증
  if (payment.amount?.total !== amount) {
    return new Response(JSON.stringify({ error: '결제 금액이 일치하지 않습니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
  }

  // 2. 검증 성공 → DB 업데이트 (3회 재시도)
  let dbSuccess = false;
  let lastError = '';

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (type === 'plan' && plan && days) {
        // 플랜 활성화 — plan 화이트리스트 재검증
        const ALLOWED_PLANS = ['pro', 'ultra'];
        if (!ALLOWED_PLANS.includes(plan)) {
          lastError = `Invalid plan: ${plan}`;
          break;
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        // return=representation + select=id로 실제 업데이트된 rows 확인
        // (profiles 행이 아직 생성되지 않은 race condition에서 0 rows 업데이트 감지)
        const res = await fetch(
          `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(auth.userId ?? '')}&select=id`,
          {
            method: 'PATCH',
            headers: {
              'apikey': env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              plan,
              plan_expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            }),
          }
        );

        if (!res.ok) {
          lastError = `Profile update failed: ${res.status}`;
        } else {
          const rows = (await res.json()) as Array<{ id: string }>;
          if (rows.length === 0) {
            // profiles 행이 없음 — upsert fallback 시도
            const upsertRes = await fetch(
              `${env.SUPABASE_URL}/rest/v1/profiles`,
              {
                method: 'POST',
                headers: {
                  'apikey': env.SUPABASE_SERVICE_KEY,
                  'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates,return=representation',
                },
                body: JSON.stringify({
                  id: auth.userId,
                  plan,
                  plan_expires_at: expiresAt.toISOString(),
                  updated_at: new Date().toISOString(),
                }),
              }
            );
            if (upsertRes.ok) {
              const upsertRows = (await upsertRes.json()) as Array<{ id: string }>;
              if (upsertRows.length > 0) { dbSuccess = true; break; }
              lastError = 'Upsert returned 0 rows';
            } else {
              lastError = `Profile upsert failed: ${upsertRes.status}`;
            }
          } else {
            dbSuccess = true;
            break;
          }
        }
      } else if (type === 'report' && simulationId) {
        // 리포트 구매 기록
        const res = await fetch(
          `${env.SUPABASE_URL}/rest/v1/report_purchases`,
          {
            method: 'POST',
            headers: {
              'apikey': env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              user_id: auth.userId,
              simulation_id: simulationId,
              payment_id: paymentId,
              amount,
            }),
          }
        );
        if (res.ok) { dbSuccess = true; break; }
        lastError = `Report purchase insert failed: ${res.status}`;
      }
    } catch (e: any) {
      lastError = e.message || 'DB write failed';
    }

    // 재시도 전 대기 (지수 백오프)
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt + 1) * 500));
    }
  }

  if (!dbSuccess) {
    // 결제 성공했지만 DB 쓰기 실패 → 로그 + 사용자 안내
    console.error(`PAYMENT_DB_FAILURE: userId=${auth.userId}, paymentId=${paymentId}, type=${type}, error=${lastError}`);
    return new Response(JSON.stringify({
      error: '결제는 완료되었으나 활성화에 실패했습니다. 고객센터에 문의해주세요.',
      paymentId,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
  });
}

// ────────────────────────────────────────────────────────────────
// 메인 핸들러
// ────────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS 프리플라이트
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env, request) });
    }

    const url = new URL(request.url);

    // 헬스체크 (키 지문 노출 금지 — OK 여부만 응답)
    if (url.pathname === '/health') {
      const hasLegacyKey = !!(env.GEMINI_KEY_V2 || env.GEMINI_API_KEY);
      const usingVertex  = vertexEnabled(env);
      const ok = usingVertex || hasLegacyKey;
      return new Response(JSON.stringify({ ok, mode: usingVertex ? 'vertex' : 'legacy' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stripe Webhook (Stripe 서명으로 자체 검증, JWT 불필요. Origin 헤더도 없이 옴)
    if (url.pathname === '/api/stripe-webhook' && request.method === 'POST') {
      return handleStripeWebhook(request, env);
    }

    // Origin 엄격 검증 (빈 Origin 차단 — curl/서버-간 호출 악용 방지)
    // ALLOWED_ORIGIN = '*' 설정 시에만 Origin 없는 요청 허용 (개발용)
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN;
    if (allowed && allowed !== '*') {
      if (!origin || origin !== allowed) {
        return new Response('Forbidden: origin not allowed', { status: 403 });
      }
    }

    // JWT 인증
    const auth = await verifyAuth(request, env);

    // 결제 API는 JWT 필수
    const paymentRoutes = ['/api/verify-payment', '/api/create-checkout', '/api/customer-portal'];
    if (!auth.valid && paymentRoutes.includes(url.pathname)) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
      });
    }

    // 포트원 결제 검증 (인증 후)
    if (url.pathname === '/api/verify-payment' && request.method === 'POST') {
      return handleVerifyPayment(request, env, auth);
    }

    // Stripe Checkout (인증 후)
    if (url.pathname === '/api/create-checkout' && request.method === 'POST') {
      return handleCreateCheckout(request, env, auth);
    }

    // Stripe Customer Portal (인증 후)
    if (url.pathname === '/api/customer-portal' && request.method === 'POST') {
      return handleCustomerPortal(request, env, auth);
    }

    // Rate Limiting: 인증 사용자는 userId, 게스트는 IP 기반
    const rateLimitId = auth.valid
      ? auth.userId!
      : `ip:${request.headers.get('CF-Connecting-IP') || 'unknown'}`;
    const rateLimitPlan = auth.valid ? auth.plan! : 'guest';
    const withinLimit = await checkRateLimit(rateLimitId, rateLimitPlan, env);
    if (!withinLimit) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', upgrade: '/pricing' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
      });
    }

    // WebSocket 업그레이드 (Gemini Live API)
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return handleWebSocket(request, env, url);
    }

    // 일반 HTTP
    return handleHTTP(request, env, url);
  },
};

// ────────────────────────────────────────────────────────────────
// HTTP 프록시
// Vertex AI 모드(USE_VERTEX=true, 기본): 국가 차단 없는 `{region}-aiplatform.googleapis.com` 로 포워드.
// Legacy 모드(USE_VERTEX=false): 기존 `generativelanguage.googleapis.com` 로 포워드 (롤백용).
// ────────────────────────────────────────────────────────────────
async function handleHTTP(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/^\/?api\/gemini/, '') || url.pathname;

  if (vertexEnabled(env)) {
    return handleVertexHTTP(request, env, path, url.search);
  }
  return handleLegacyHTTP(request, env, path, url.search);
}

async function handleVertexHTTP(
  request: Request,
  env: Env,
  path: string,
  search: string
): Promise<Response> {
  const projectId = env.GCP_PROJECT_ID!;
  const location  = env.VERTEX_LOCATION || 'us-central1';

  const vertexPath = rewritePathToVertex(path, projectId, location);
  if (!vertexPath) {
    return new Response(
      JSON.stringify({ error: `Unsupported Gemini path for Vertex proxy: ${path}` }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) } }
    );
  }

  const token = await getVertexAccessToken(env);
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Vertex access token unavailable. Check VERTEX_SA_JSON secret.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) } }
    );
  }

  // SDK 가 붙이는 key 쿼리 파라미터는 Vertex 가 무시하지만 정리해서 보냄.
  const cleanSearch = search.replace(/[?&]key=[^&]*/g, '').replace(/^&/, '?') || '';
  const normalizedSearch = cleanSearch.startsWith('?') || cleanSearch === '' ? cleanSearch : `?${cleanSearch}`;
  const targetUrl = `https://${location}-aiplatform.googleapis.com${vertexPath}${normalizedSearch}`;

  const headers = new Headers();
  // content-type 만 보존, 나머지 헤더는 재작성하여 클라이언트 헤더 유출 차단
  const inboundCT = request.headers.get('content-type');
  if (inboundCT) headers.set('Content-Type', inboundCT);
  const inboundAccept = request.headers.get('accept');
  if (inboundAccept) headers.set('Accept', inboundAccept);
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  });

  const responseHeaders = new Headers(response.headers);
  const cors = corsHeaders(env, request);
  Object.entries(cors).forEach(([k, v]) => responseHeaders.set(k, v));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

async function handleLegacyHTTP(
  request: Request,
  env: Env,
  path: string,
  search: string
): Promise<Response> {
  const geminiKey = env.GEMINI_KEY_V2 || env.GEMINI_API_KEY;
  // SDK가 보내는 key=proxy 파라미터 제거 후 실제 API 키로 교체
  const cleanSearch = search.replace(/[?&]key=[^&]*/g, '');
  const separator = cleanSearch ? '&' : '?';
  const targetUrl = `${GOOGLE_AI_BASE}${path}${cleanSearch || '?'}${cleanSearch ? separator : ''}key=${geminiKey}`;

  const headers = new Headers(request.headers);
  headers.set('x-goog-api-key', geminiKey);
  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');
  headers.delete('authorization');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ray');
  headers.delete('x-forwarded-for');
  headers.delete('x-real-ip');
  headers.delete('x-forwarded-proto');
  headers.delete('x-forwarded-host');

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  });

  const responseHeaders = new Headers(response.headers);
  const cors = corsHeaders(env, request);
  Object.entries(cors).forEach(([k, v]) => responseHeaders.set(k, v));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

// ────────────────────────────────────────────────────────────────
// WebSocket 프록시 (Gemini Live Audio API)
// ────────────────────────────────────────────────────────────────
async function handleWebSocket(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/^\/?api\/gemini/, '');
  const cleanSearch = url.search.replace(/[?&]key=[^&]*/g, '');
  const separator = cleanSearch ? '&' : '?';
  const geminiKeyWs = env.GEMINI_KEY_V2 || env.GEMINI_API_KEY;
  const targetUrl = `${GOOGLE_AI_WS}${path}${cleanSearch || '?'}${cleanSearch ? separator : ''}key=${geminiKeyWs}`;

  const { 0: clientSocket, 1: serverSocket } = new WebSocketPair();
  (serverSocket as any).accept();

  const googleSocket = new WebSocket(targetUrl) as any;

  serverSocket.addEventListener('message', (event: MessageEvent) => {
    if (googleSocket.readyState === 1) googleSocket.send(event.data);
  });
  googleSocket.addEventListener('message', (event: MessageEvent) => {
    try { (serverSocket as any).send(event.data); } catch (_) {}
  });
  serverSocket.addEventListener('close', (event: CloseEvent) => {
    try { googleSocket.close(event.code, event.reason); } catch (_) {}
  });
  googleSocket.addEventListener('close', (event: CloseEvent) => {
    try { (serverSocket as any).close(event.code, event.reason); } catch (_) {}
  });
  serverSocket.addEventListener('error', () => { try { googleSocket.close(1011); } catch (_) {} });
  googleSocket.addEventListener('error', () => {
    try { (serverSocket as any).close(1011, 'Google AI connection error'); } catch (_) {}
  });

  return new Response(null, { status: 101, webSocket: clientSocket } as any);
}

// ────────────────────────────────────────────────────────────────
// CORS 헤더 생성
// ────────────────────────────────────────────────────────────────
function corsHeaders(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = env.ALLOWED_ORIGIN === '*' ? '*' : (origin || env.ALLOWED_ORIGIN);
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type, x-goog-api-key, x-goog-api-client, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
