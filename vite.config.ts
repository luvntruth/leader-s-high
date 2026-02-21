import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * API 키는 클라이언트 번들에 포함되지 않습니다.
 * - 개발: .env.local의 VITE_API_KEY (import.meta.env.VITE_API_KEY)
 * - 프로덕션: .env.production의 VITE_GEMINI_PROXY_URL → Cloudflare Worker 프록시 사용
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
});