import { buildClarityScriptUrl, resolveClarityConfig } from '../src/lib/clarityConfig';

const CLARITY_SCRIPT_ID = 'ms-clarity-script';

type ClarityFunction = ((...args: unknown[]) => void) & { q?: unknown[] };

declare global {
  interface Window {
    clarity?: ClarityFunction;
  }
}

export function initMicrosoftClarity(projectId: string | undefined): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const config = resolveClarityConfig({ projectId, hostname: window.location.hostname });
  if (!config.enabled) return;

  if (document.getElementById(CLARITY_SCRIPT_ID)) return;

  window.clarity = window.clarity || function clarityStub(...args: unknown[]) {
    (window.clarity!.q = window.clarity!.q || []).push(args);
  };

  const script = document.createElement('script');
  script.id = CLARITY_SCRIPT_ID;
  script.async = true;
  script.src = buildClarityScriptUrl(config.projectId);
  document.head.appendChild(script);
}

/** 광고 A/B 버전 식별용 커스텀 태그 주입.
 *  Clarity 대시보드에서 lp(버전)/utm 으로 세션을 필터·세그먼트할 수 있게 한다.
 *  스크립트 로드 전 호출분은 clarity 스텁 큐에 적재되어 로드 후 반영된다. */
export function setClarityTags(tags: Record<string, string | undefined>): void {
  if (typeof window === 'undefined' || typeof window.clarity !== 'function') return;
  for (const [key, value] of Object.entries(tags)) {
    if (value) window.clarity('set', key, value);
  }
}
