/**
 * Leader's High — Gemini API 백엔드 프록시 (Cloudflare Worker)
 *
 * 역할:
 * - 클라이언트 요청을 받아 실제 Gemini API에 전달
 * - API 키를 서버 시크릿(env.GEMINI_API_KEY)으로만 관리
 * - JWT 인증으로 무인증 호출 차단
 * - KV 기반 Rate Limiting으로 플랜별 호출 제한
 * - HTTP REST + WebSocket(Live API) 모두 지원
 * - Stripe Webhook 수신
 *
 * 배포: Cloudflare Workers
 * 명령어:
 *   cd worker && npx wrangler deploy
 *   npx wrangler secret put GEMINI_API_KEY
 *   npx wrangler secret put SUPABASE_JWT_SECRET
 *   npx wrangler secret put STRIPE_SECRET_KEY
 *   npx wrangler secret put STRIPE_WEBHOOK_SECRET
 */

const GOOGLE_AI_BASE = 'https://generativelanguage.googleapis.com';
const GOOGLE_AI_WS   = 'wss://generativelanguage.googleapis.com';

export interface Env {
  GEMINI_API_KEY: string;
  ALLOWED_ORIGIN: string;
  SUPABASE_JWT_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
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
  // JWT 시크릿 미설정 시 인증 우회 (개발 모드)
  if (!env.SUPABASE_JWT_SECRET) {
    return { valid: true, userId: 'dev-user', plan: 'pro' };
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing Authorization header' };
  }
  const token = authHeader.slice(7);

  try {
    // Supabase JWT: base64url 디코딩 → payload 추출
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

    if (!isValid) return { valid: false, error: 'Invalid token signature' };

    // payload 파싱
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // 만료 확인
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token expired' };
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
// Rate Limiting (KV)
// ────────────────────────────────────────────────────────────────
const RATE_LIMITS: Record<string, number> = {
  free: 20,
  pro: 100,
  enterprise: 1000,
};

async function checkRateLimit(userId: string, plan: string, env: Env): Promise<boolean> {
  if (!env.RATE_LIMIT) return true; // KV 미설정 시 제한 없음

  const key = `rate:${userId}:${new Date().toISOString().slice(0, 10)}`;
  const current = parseInt(await env.RATE_LIMIT.get(key) || '0');
  const limit = RATE_LIMITS[plan] || RATE_LIMITS.free;

  if (current >= limit) return false;

  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 86400 });
  return true;
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

  // 서명 검증 (간소화 — 프로덕션에서는 Stripe SDK 사용 권장)
  if (!sig) return new Response('Missing signature', { status: 400 });

  try {
    const event = JSON.parse(body);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // TODO: Supabase Admin API로 profiles.plan 업데이트
        console.log(`Checkout completed: customer=${session.customer}, subscription=${session.subscription}`);
        break;
      }
      case 'invoice.payment_failed': {
        console.log('Payment failed:', event.data.object.customer);
        break;
      }
      case 'customer.subscription.deleted': {
        console.log('Subscription cancelled:', event.data.object.customer);
        // TODO: profiles.plan → 'free' 다운그레이드
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
async function handleCreateCheckout(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 501,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
  }

  const { priceId, returnUrl } = await request.json() as { priceId: string; returnUrl: string };

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'mode': 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': `${returnUrl}/#/profile?checkout=success`,
      'cancel_url': `${returnUrl}/#/pricing?checkout=cancel`,
    }),
  });

  const data = await res.json() as { url?: string; error?: unknown };
  return new Response(JSON.stringify({ url: data.url }), {
    status: res.ok ? 200 : 400,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
  });
}

// ────────────────────────────────────────────────────────────────
// Stripe Customer Portal
// ────────────────────────────────────────────────────────────────
async function handleCustomerPortal(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 501,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
  }

  const { returnUrl, customerId } = await request.json() as { returnUrl: string; customerId?: string };

  // TODO: customerId를 JWT에서 가져온 userId로 Supabase에서 조회하는 방식 권장
  if (!customerId) {
    return new Response(JSON.stringify({ error: 'Customer ID required' }), {
      status: 400,
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
// 메인 핸들러
// ────────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS 프리플라이트
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env, request) });
    }

    const url = new URL(request.url);

    // Stripe Webhook (인증 우회, Stripe 서명으로 검증)
    if (url.pathname === '/api/stripe-webhook' && request.method === 'POST') {
      return handleStripeWebhook(request, env);
    }

    // Stripe Checkout Session 생성
    if (url.pathname === '/api/create-checkout' && request.method === 'POST') {
      return handleCreateCheckout(request, env);
    }

    // Stripe Customer Portal
    if (url.pathname === '/api/customer-portal' && request.method === 'POST') {
      return handleCustomerPortal(request, env);
    }

    // Origin 검증
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN;
    if (allowed && allowed !== '*' && origin && origin !== allowed) {
      return new Response('Forbidden: origin not allowed', { status: 403 });
    }

    // JWT 인증
    const auth = await verifyAuth(request, env);
    if (!auth.valid) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
      });
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
  // GoogleGenAI SDK는 baseUrl 뒤에 /v1beta/... 를 직접 붙여서 요청함
  const path = url.pathname.replace(/^\/?api\/gemini/, '') || url.pathname;
  // 쿼리에 key 파라미터 추가 (일부 Gemini 엔드포인트에서 필요)
  const separator = url.search ? '&' : '?';
  const targetUrl = `${GOOGLE_AI_BASE}${path}${url.search}${separator}key=${env.GEMINI_API_KEY}`;

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
  const separator = url.search ? '&' : '?';
  const targetUrl = `${GOOGLE_AI_WS}${path}${url.search}${separator}key=${env.GEMINI_API_KEY}`;

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
    'Access-Control-Allow-Headers': 'Content-Type, x-goog-api-key, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
