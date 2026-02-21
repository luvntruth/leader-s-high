/**
 * Leader's High — Gemini API 백엔드 프록시 (Cloudflare Worker)
 *
 * 역할:
 * - 클라이언트 요청을 받아 실제 Gemini API에 전달
 * - API 키를 서버 시크릿(env.GEMINI_API_KEY)으로만 관리
 * - 클라이언트 번들에는 API 키가 절대 포함되지 않음
 * - HTTP REST + WebSocket(Live API) 모두 지원
 *
 * 배포: Cloudflare Workers
 * 명령어:
 *   cd worker && npx wrangler deploy
 *   npx wrangler secret put GEMINI_API_KEY  (실제 API 키 등록)
 */

const GOOGLE_AI_BASE = 'https://generativelanguage.googleapis.com';
const GOOGLE_AI_WS   = 'wss://generativelanguage.googleapis.com';

export interface Env {
  GEMINI_API_KEY: string;
  /** 허용할 프론트엔드 오리진. 예: https://leadershigh.app */
  ALLOWED_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // ── CORS 프리플라이트 ───────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env, request) });
    }

    // ── Origin 검증 ────────────────────────────────────────────
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN;
    if (allowed && allowed !== '*' && origin && origin !== allowed) {
      return new Response('Forbidden: origin not allowed', { status: 403 });
    }

    const url = new URL(request.url);

    // ── WebSocket 업그레이드 감지 (Gemini Live API) ──────────────
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return handleWebSocket(request, env, url);
    }

    // ── 일반 HTTP 요청 ─────────────────────────────────────────
    return handleHTTP(request, env, url);
  },
};

// ────────────────────────────────────────────────────────────────
// HTTP 프록시
// ────────────────────────────────────────────────────────────────
async function handleHTTP(request: Request, env: Env, url: URL): Promise<Response> {
  // /api/gemini 프리픽스 제거 후 Google AI 엔드포인트로 전달
  const path = url.pathname.replace(/^\/?api\/gemini/, '');
  const targetUrl = `${GOOGLE_AI_BASE}${path}${url.search}`;

  const headers = new Headers(request.headers);
  // 실제 API 키를 서버에서 주입 (클라이언트가 보낸 키는 덮어쓴다)
  headers.set('x-goog-api-key', env.GEMINI_API_KEY);
  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');
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

  // API 키를 query param으로 추가 (Live API WebSocket 인증 방식)
  const separator = url.search ? '&' : '?';
  const targetUrl = `${GOOGLE_AI_WS}${path}${url.search}${separator}key=${env.GEMINI_API_KEY}`;

  // Cloudflare WebSocketPair: client ↔ worker ↔ Google AI
  const { 0: clientSocket, 1: serverSocket } = new WebSocketPair();
  (serverSocket as any).accept();

  // Google AI WebSocket 연결
  const googleSocket = new WebSocket(targetUrl) as any;

  // 클라이언트 → Google
  serverSocket.addEventListener('message', (event: MessageEvent) => {
    if (googleSocket.readyState === 1 /* OPEN */) {
      googleSocket.send(event.data);
    }
  });

  // Google → 클라이언트
  googleSocket.addEventListener('message', (event: MessageEvent) => {
    try { (serverSocket as any).send(event.data); } catch (_) {}
  });

  // 연결 종료 동기화
  serverSocket.addEventListener('close', (event: CloseEvent) => {
    try { googleSocket.close(event.code, event.reason); } catch (_) {}
  });
  googleSocket.addEventListener('close', (event: CloseEvent) => {
    try { (serverSocket as any).close(event.code, event.reason); } catch (_) {}
  });

  // 에러 처리
  serverSocket.addEventListener('error', () => { try { googleSocket.close(1011); } catch (_) {} });
  googleSocket.addEventListener('error', () => {
    try { (serverSocket as any).close(1011, 'Google AI connection error'); } catch (_) {}
  });

  return new Response(null, {
    status: 101,
    webSocket: clientSocket,
  } as any);
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
