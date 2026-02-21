/**
 * Gemini AI 클라이언트 팩토리
 *
 * 보안 모델:
 * - 프로덕션: VITE_GEMINI_PROXY_URL만 설정 → API 키가 클라이언트 번들에 없음
 * - 개발:     VITE_API_KEY를 .env.local에 설정 (절대 커밋 금지)
 *
 * 사용법:
 *   import { createGeminiClient } from '../lib/geminiClient';
 *   const ai = createGeminiClient();
 */

/// <reference types="vite/client" />
import { GoogleGenAI } from '@google/genai';

export function createGeminiClient(): GoogleGenAI {
  const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined;

  if (proxyUrl) {
    // ── 프로덕션 경로 ────────────────────────────────────────────
    // 클라이언트에는 API 키가 없다. Worker가 키를 주입한다.
    return new GoogleGenAI({
      apiKey: 'proxy',
      httpOptions: { baseUrl: proxyUrl },
    });
  }

  // ── 개발 전용 경로 ────────────────────────────────────────────
  // VITE_API_KEY는 .env.local에만 존재해야 하며 절대 커밋되면 안 됩니다.
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
