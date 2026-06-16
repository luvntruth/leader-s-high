// Meta(Facebook) Pixel 설정 해석기 — clarityConfig 와 동일한 패턴.
// 광고 성과 추적: 랜딩(www.letmefree.xyz)과 동일 Pixel ID 를 앱(app.letmefree.xyz)에도
// 적용해 가입(CompleteRegistration)·결제(Purchase) 전환을 Meta 가 보게 한다.

// 랜딩(leaders-high-landing)에서 사용 중인 운영 Pixel ID. env 미설정 시 기본값으로 사용.
// 공개 클라이언트 식별자(비밀 아님)이므로 소스에 두어도 무방하며, 랜딩 HTML 에도 노출되어 있다.
export const DEFAULT_META_PIXEL_ID = '1253075797006595';

export type MetaPixelConfigInput = {
  pixelId?: string;
  hostname?: string;
};

export type MetaPixelConfig =
  | { enabled: true; pixelId: string }
  | { enabled: false; reason: 'missing-pixel-id' | 'local-development' };

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

export function resolveMetaPixelConfig(input: MetaPixelConfigInput): MetaPixelConfig {
  const pixelId = input.pixelId?.trim();
  if (!pixelId) {
    return { enabled: false, reason: 'missing-pixel-id' };
  }

  const hostname = input.hostname?.toLowerCase();
  if (hostname && (LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith('.local'))) {
    return { enabled: false, reason: 'local-development' };
  }

  return { enabled: true, pixelId };
}

export function buildPixelScriptSrc(): string {
  return 'https://connect.facebook.net/en_US/fbevents.js';
}
