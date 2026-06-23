type AiErrorMessageInput = {
  status?: number;
  detail?: string;
};

const DEPLOYMENT_ERROR_MESSAGE = '운영 설정 오류: AI 연결 키 또는 프록시 설정이 잘못되었습니다. 배포 환경의 VITE_GEMINI_PROXY_URL / GEMINI_API_KEY를 확인해주세요.';
const LOCATION_RESTRICTION_MESSAGE = '운영 제한: 현재 AI 제공자가 이 요청 지역을 지원하지 않습니다. API 키 재입력보다 프록시 실행 위치 또는 모델 제공 경로를 변경해야 합니다.';

export function getAiErrorMessage({ status, detail = '' }: AiErrorMessageInput) {
  const normalized = detail.toLowerCase();

  if (normalized.includes('api key expired') || normalized.includes('api_key_invalid') || normalized.includes('invalid api key')) {
    return DEPLOYMENT_ERROR_MESSAGE;
  }

  if (normalized.includes('user location is not supported') || normalized.includes('failed_precondition')) {
    return LOCATION_RESTRICTION_MESSAGE;
  }

  // Vertex 서비스 계정 토큰 발급 실패 (영어 원문 노출 방지)
  if (normalized.includes('vertex access token') || normalized.includes('token unavailable')) {
    return 'AI 서버 인증에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }

  if (status === 401 || status === 403) {
    return '인증 오류가 발생했습니다. 다시 로그인하거나 잠시 후 시도해주세요.';
  }

  if (status === 404) {
    return '모델을 찾을 수 없습니다. 설정을 확인해주세요.';
  }

  if (status === 429) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }

  // 5xx (Vertex/프록시 일시 장애 등) — 영어 JSON 원문 대신 한국어 안내
  if (status && status >= 500) {
    return 'AI 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }

  // 기본 폴백: 사용자에게 영어 detail 을 그대로 노출하지 않는다.
  return 'AI 응답 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}

export function getInitErrorMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  return getAiErrorMessage({ detail });
}
