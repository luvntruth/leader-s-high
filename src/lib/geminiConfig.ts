type ResolveGeminiRuntimeConfigInput = {
  proxyUrl?: string;
  apiKey?: string;
  hostname?: string;
  authToken?: string | null;
};

export type GeminiRuntimeConfig =
  | { mode: 'proxy'; baseUrl: string; credential: string }
  | { mode: 'direct'; credential: string };

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function resolveGeminiRuntimeConfig({ proxyUrl, apiKey, hostname, authToken }: ResolveGeminiRuntimeConfigInput): GeminiRuntimeConfig {
  if (proxyUrl) {
    return {
      mode: 'proxy',
      baseUrl: proxyUrl,
      credential: authToken || 'no-token',
    };
  }

  if (hostname && !LOCAL_HOSTS.has(hostname)) {
    throw new Error('[geminiClient] 프로덕션/스테이징 환경에서는 VITE_GEMINI_PROXY_URL이 반드시 필요합니다. 현재 설정에서는 브라우저가 Gemini를 직접 호출하게 됩니다.');
  }

  if (!apiKey) {
    throw new Error('[geminiClient] VITE_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요.');
  }

  return {
    mode: 'direct',
    credential: apiKey,
  };
}
