/**
 * Leader's High — Gemini API 백엔드 프록시 (Cloudflare Worker)
 *
 * 배포:
 *   cd worker && npx wrangler deploy
 *   npx wrangler secret put GEMINI_API_KEY
 *   npx wrangler secret put SUPABASE_JWT_SECRET
 *   npx wrangler secret put SUPABASE_SERVICE_KEY
 *   npx wrangler secret put STRIPE_SECRET_KEY
 *   npx wrangler secret put STRIPE_WEBHOOK_SECRET
 *   npx wrangler secret put PORTONE_API_SECRET
 */

const GOOGLE_AI_BASE = 'https://generativelanguage.googleapis.com';
const GOOGLE_AI_WS   = 'wss://generativelanguage.googleapis.com';

export interface Env {
  GEMINI_API_KEY: string;
  ALLOWED_ORIGIN: string;
  SUPABASE_JWT_SECRET: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  PORTONE_API_SECRET?: string;
  RATE_LIMIT?: KVNamespace;
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

    // issuer/audience 검증
    if (payload.iss !== 'supabase' && !payload.iss?.includes('supabase')) {
      return { valid: false, error: 'Invalid token issuer' };
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
// Rate Limiting (KV 또는 메모리 폴백)
// ────────────────────────────────────────────────────────────────
const RATE_LIMITS: Record<string, number> = {
  free: 20,
  pro: 100,
  ultra: 1000,
};

// KV 미설정 시 메모리 기반 폴백 (Worker 재시작 시 리셋)
const memoryRateStore = new Map<string, number>();

async function checkRateLimit(userId: string, plan: string, env: Env): Promise<boolean> {
  const key = `rate:${userId}:${new Date().toISOString().slice(0, 10)}`;
  const limit = RATE_LIMITS[plan] || RATE_LIMITS.free;

  if (env.RATE_LIMIT) {
    const current = parseInt(await env.RATE_LIMIT.get(key) || '0');
    if (current >= limit) return false;
    await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 86400 });
    return true;
  }

  // 메모리 폴백
  const current = memoryRateStore.get(key) || 0;
  if (current >= limit) return false;
  memoryRateStore.set(key, current + 1);
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

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.customer && session.metadata?.plan) {
          await updateProfilePlan(env, session.customer, session.metadata.plan);
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

  const { priceId, plan, returnUrl } = await request.json() as {
    priceId: string; plan: string; returnUrl: string;
  };

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
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'success_url': `${returnUrl}/#/profile?checkout=success`,
    'cancel_url': `${returnUrl}/#/pricing?checkout=cancel`,
    'metadata[plan]': plan || 'pro',
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
        // 플랜 활성화
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        const res = await fetch(
          `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(auth.userId ?? '')}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              plan,
              plan_expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            }),
          }
        );
        if (res.ok) { dbSuccess = true; break; }
        lastError = `Profile update failed: ${res.status}`;
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

    // Stripe Webhook (Stripe 서명으로 자체 검증, JWT 불필요)
    if (url.pathname === '/api/stripe-webhook' && request.method === 'POST') {
      return handleStripeWebhook(request, env);
    }

    // Origin 검증
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN;
    if (allowed && allowed !== '*' && origin && origin !== allowed) {
      return new Response('Forbidden: origin not allowed', { status: 403 });
    }

    // JWT 인증 (Stripe Webhook 외 모든 요청)
    const auth = await verifyAuth(request, env);
    if (!auth.valid) {
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

    // Rate Limiting
    const withinLimit = await checkRateLimit(auth.userId!, auth.plan!, env);
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
// ────────────────────────────────────────────────────────────────
async function handleHTTP(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/^\/?api\/gemini/, '') || url.pathname;
  // SDK가 보내는 key=proxy 파라미터 제거 후 실제 API 키로 교체
  const cleanSearch = url.search.replace(/[?&]key=[^&]*/g, '');
  const separator = cleanSearch ? '&' : '?';
  const targetUrl = `${GOOGLE_AI_BASE}${path}${cleanSearch || '?'}${cleanSearch ? separator : ''}key=${env.GEMINI_API_KEY}`;

  const headers = new Headers(request.headers);
  headers.set('x-goog-api-key', env.GEMINI_API_KEY);
  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');
  headers.delete('authorization');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ray');

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
  const targetUrl = `${GOOGLE_AI_WS}${path}${cleanSearch || '?'}${cleanSearch ? separator : ''}key=${env.GEMINI_API_KEY}`;

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
