
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import { analyticsService } from './services/analyticsService';
import { initMicrosoftClarity } from './services/clarityService';
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
