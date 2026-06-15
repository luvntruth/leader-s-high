import { defineConfig, devices } from '@playwright/test';

/**
 * 게스트 무료체험 Customer Journey 스모크 테스트용 설정.
 * vite dev 서버(포트 3001)를 자동 기동하며, .env.local 의 프록시/PortOne 설정을 그대로 사용한다.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3001',
    headless: true,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
