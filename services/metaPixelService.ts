import { buildPixelScriptSrc, resolveMetaPixelConfig } from '../src/lib/metaPixelConfig';
import { analyticsService } from './analyticsService';

// Meta Pixel 부트스트랩 + 표준 이벤트 헬퍼.
// 광고 전환 추적용: 앱 진입 시 PageView, 가입/결제 시 CompleteRegistration·Purchase 발화.

const PIXEL_SCRIPT_ID = 'meta-pixel-script';

type FbqFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
  }
}

export function initMetaPixel(pixelId: string | undefined): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const config = resolveMetaPixelConfig({ pixelId, hostname: window.location.hostname });
  if (!config.enabled) return;

  if (document.getElementById(PIXEL_SCRIPT_ID)) return;

  // Meta 표준 fbq 스텁 (스크립트 로드 전 호출분을 큐에 적재)
  const fbq: FbqFunction = function fbqStub(...args: unknown[]) {
    fbq.callMethod ? fbq.callMethod(...args) : fbq.queue!.push(args);
  };
  if (!window._fbq) window._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  window.fbq = fbq;

  const script = document.createElement('script');
  script.id = PIXEL_SCRIPT_ID;
  script.async = true;
  script.src = buildPixelScriptSrc();
  document.head.appendChild(script);

  window.fbq('init', config.pixelId);
  window.fbq('track', 'PageView');
}

/** 광고 버전(A/B) 식별용 어트리뷰션을 전환 이벤트에 자동 첨부.
 *  랜딩에서 전달된 lp(버전)/utm/cta 가 sessionStorage 에 보존되어 있으므로 모든 전환에 따라붙는다. */
function attributionParams(): Record<string, unknown> {
  const a = analyticsService.getAttribution();
  const out: Record<string, unknown> = {};
  if (a.lp) out.lp = a.lp;                       // 랜딩 버전: practice/diagnosis/new-manager
  if (a.utm_source) out.utm_source = a.utm_source;
  if (a.utm_medium) out.utm_medium = a.utm_medium;
  if (a.utm_campaign) out.utm_campaign = a.utm_campaign;
  if (a.utm_content) out.utm_content = a.utm_content; // 광고 소재(버전) 식별
  if (a.cta) out.cta = a.cta;
  return out;
}

/** 표준 전환 이벤트 발화. Pixel 미초기화(로컬/미설정) 시 조용히 무시.
 *  A/B 버전 측정을 위해 lp/utm/cta 를 custom_data 로 자동 첨부한다. */
export function trackPixelEvent(event: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', event, { ...attributionParams(), ...params });
}
