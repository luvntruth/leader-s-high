/**
 * Gemini AI 클라이언트 팩토리
 *
 * 프로덕션: apiKey에 JWT 토큰을 넣어 SDK가 x-goog-api-key 헤더로 전송
 *          → Worker가 이 헤더에서 JWT를 추출하여 검증
 * 개발:    VITE_API_KEY를 직접 사용
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

export function createGeminiClient(): GoogleGenAI {
  const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined;

  if (proxyUrl) {
    // 프로덕션: JWT 토큰을 apiKey로 전달 → SDK가 x-goog-api-key 헤더에 설정
    const token = localStorage.getItem(AUTH_TOKEN_KEY) || 'no-token';
    return new GoogleGenAI({
      apiKey: token,
      httpOptions: { baseUrl: proxyUrl },
    });
  }

  // 개발: 직접 API 키 사용
  const devKey = import.meta.env.VITE_API_KEY as string | undefined;
  if (!devKey) {
    console.error('[geminiClient] API 키 설정 없음!');
  }
  return new GoogleGenAI({ apiKey: devKey ?? '' });
}
