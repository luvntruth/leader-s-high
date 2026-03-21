/**
 * Gemini AI 클라이언트 팩토리
 *
 * 보안 모델:
 * - 프로덕션: VITE_GEMINI_PROXY_URL만 설정 → API 키가 클라이언트 번들에 없음
 * - 개발:     VITE_API_KEY를 .env.local에 설정 (절대 커밋 금지)
 */

/// <reference types="vite/client" />
import { GoogleGenAI } from '@google/genai';

const AUTH_TOKEN_KEY = 'leadershigh_auth_token';

/** AuthContext에서 로그인 성공 시 호출하여 토큰 저장 */
export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/** 로그아웃 시 토큰 제거 */
export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * 프록시 URL 요청에 Authorization 헤더를 자동 주입하는 fetch 래퍼
 */
let authFetchInstalled = false;
function installAuthFetch() {
  if (authFetchInstalled) return;
  authFetchInstalled = true;

  const originalFetch = window.fetch.bind(window);
  const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // 프록시 URL로의 요청에만 Authorization 헤더 추가
    if (proxyUrl && url.startsWith(proxyUrl)) {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        const headers = new Headers(init?.headers);
        headers.set('Authorization', `Bearer ${token}`);
        return originalFetch(input, { ...init, headers });
      }
    }
    return originalFetch(input, init);
  };
}

export function createGeminiClient(): GoogleGenAI {
  const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined;

  if (proxyUrl) {
    installAuthFetch();
    return new GoogleGenAI({
      apiKey: 'proxy',
      httpOptions: { baseUrl: proxyUrl },
    });
  }

  const devKey = import.meta.env.VITE_API_KEY as string | undefined;
  if (!devKey) {
    console.error(
      '[geminiClient] API 키 설정 없음!\n' +
      '개발: .env.local에 VITE_API_KEY 설정\n' +
      '프로덕션: .env.production에 VITE_GEMINI_PROXY_URL 설정'
    );
  }
  return new GoogleGenAI({ apiKey: devKey ?? '' });
}
