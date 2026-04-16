type AiErrorMessageInput = {
  status?: number;
  detail?: string;
};

const DEPLOYMENT_ERROR_MESSAGE = '운영 설정 오류: AI 연결 키 또는 프록시 설정이 잘못되었습니다. 배포 환경의 VITE_GEMINI_PROXY_URL / GEMINI_API_KEY를 확인해주세요.';

export function getAiErrorMessage({ status, detail = '' }: AiErrorMessageInput) {
  const normalized = detail.toLowerCase();

  if (normalized.includes('api key expired') || normalized.includes('api_key_invalid') || normalized.includes('invalid api key')) {
    return DEPLOYMENT_ERROR_MESSAGE;
  }

  if (status === 401 || status === 403) {
    return `인증 오류: ${detail}`;
  }

  if (status === 404) {
    return '모델을 찾을 수 없습니다. 설정을 확인해주세요.';
  }

  if (status === 429) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }

  return `연결 오류: ${detail}`;
}

export function getInitErrorMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  return getAiErrorMessage({ detail });
}
