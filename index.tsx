
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import { analyticsService } from './services/analyticsService';
import { initMicrosoftClarity, setClarityTags } from './services/clarityService';
import { initMetaPixel } from './services/metaPixelService';
import { DEFAULT_META_PIXEL_ID } from './src/lib/metaPixelConfig';
import './src/index.css';

// Sentry 에러 추적 초기화
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

// Spec v3 §8: 첫 진입 시 ?lp=variant + utm_* 를 sessionStorage 에 보존
// → 이후 이벤트(sim_start, signup_complete, purchase_complete 등)에 자동 첨부
analyticsService.captureAttribution();

// 광고 집행 전 행동분석 준비: VITE_MS_CLARITY_PROJECT_ID 설정 시 Microsoft Clarity 로드
initMicrosoftClarity(import.meta.env.VITE_MS_CLARITY_PROJECT_ID as string | undefined);

// A/B 버전 식별: Clarity 에 lp(버전)/utm 을 커스텀 태그로 주입 → 대시보드에서 버전별 세그먼트
{
  const a = analyticsService.getAttribution();
  setClarityTags({ lp: a.lp, utm_source: a.utm_source, utm_campaign: a.utm_campaign, utm_content: a.utm_content });
}

// 광고 전환 추적: Meta Pixel 로드 + PageView. env 미설정 시 랜딩과 동일한 기본 Pixel 사용.
// (가입=CompleteRegistration, 결제=Purchase 는 각 전환 지점에서 trackPixelEvent 로 발화)
initMetaPixel((import.meta.env.VITE_META_PIXEL_ID as string | undefined) ?? DEFAULT_META_PIXEL_ID);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
