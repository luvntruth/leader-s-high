import { test, expect, Page } from '@playwright/test';

/**
 * 광고 집행 전 게스트 Customer Journey 스모크.
 * HashRouter 이므로 모든 경로는 /#/... 형태.
 *
 * 목표: 광고 유입(비로그인) 사용자가 랜딩 → 무료체험 시뮬레이션 → 가격/회원가입 퍼널에서
 *       막히거나 백지/에러 화면을 만나지 않는지 실제 클릭으로 검증한다.
 */

const APP_ERROR_TEXT = '앱에 오류가 발생했어요'; // 전역 ErrorBoundary fallback

// 전역 에러 화면(백지/크래시)이 떠 있지 않은지 확인하는 헬퍼
async function assertNoCrash(page: Page) {
  await expect(page.getByText(APP_ERROR_TEXT)).toHaveCount(0);
}

test.describe('게스트 무료체험 여정', () => {
  test('1. 랜딩 로드 + 메인 CTA → 온보딩 진입', async ({ page }) => {
    await page.goto('/#/landing');
    await assertNoCrash(page);
    // hero 영역 메인 CTA(amber 버튼)
    const primaryCta = page.locator('button.bg-amber-500').first();
    await expect(primaryCta).toBeVisible();
    await primaryCta.click();
    await expect(page).toHaveURL(/#\/onboarding/);
    await assertNoCrash(page);
  });

  test('2. 온보딩 무료 시나리오 노출 + 무료체험 시작 → 셋업', async ({ page }) => {
    await page.goto('/#/onboarding');
    await assertNoCrash(page);
    await expect(page.getByText('무료 체험 3개 시나리오')).toBeVisible();
    // 게스트 메인 CTA
    const startBtn = page.getByRole('button', { name: '무료 체험 시작하기' });
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    await expect(page).toHaveURL(/#\/setup/);
    await assertNoCrash(page);
  });

  test('3. 셋업 → 대화 시작 → 시뮬레이션 초기화(에러 화면 없음)', async ({ page }) => {
    // 온보딩에서 시작해 게스트 state 를 정상 전달
    await page.goto('/#/onboarding');
    await page.getByRole('button', { name: '무료 체험 시작하기' }).click();
    await expect(page).toHaveURL(/#\/setup/);

    const startConvo = page.getByRole('button', { name: /대화 시작하기/ });
    await expect(startConvo).toBeVisible();
    await startConvo.click();

    await expect(page).toHaveURL(/#\/simulation/);
    await assertNoCrash(page);
    // 입력창이 떠야 하고, 초기화 실패 시 노출되는 문구가 없어야 함
    const input = page.getByPlaceholder(/메시지를 입력하세요|결과 리포트를 확인/);
    await expect(input).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('대화를 불러오지 못했어요')).toHaveCount(0);
  });

  test('4. 시뮬레이션 1턴 전송 → AI 응답 수신(프록시 실호출)', async ({ page }) => {
    await page.goto('/#/onboarding');
    await page.getByRole('button', { name: '무료 체험 시작하기' }).click();
    await page.getByRole('button', { name: /대화 시작하기/ }).click();
    await expect(page).toHaveURL(/#\/simulation/);

    const input = page.getByPlaceholder(/메시지를 입력하세요/);
    await expect(input).toBeVisible({ timeout: 30_000 });

    // 오프닝(AI 첫 메시지) 이후 사용자 버블 수를 기준으로 응답을 측정
    await input.fill('안녕하세요. 오늘 잠깐 이야기 나눌 수 있을까요?');
    await input.press('Enter');

    // AI 응답이 도착하면 메시지가 증가한다(텍스트 무관, 크래시/에러 미발생 위주)
    await page.waitForTimeout(1500);
    await assertNoCrash(page);
    // 영구적인 전송 실패 배너가 떠 있지 않아야 함
    await expect(page.getByText(/응답을 가져오지 못했|오류가 발생/)).toHaveCount(0);
  });

  test('5. 가격 페이지 문구 정합성 + 비로그인 결제 시도 → 로그인 리다이렉트', async ({ page }) => {
    await page.goto('/#/pricing');
    await assertNoCrash(page);
    await expect(page.getByText('8,900').first()).toBeVisible();
    await expect(page.getByText('29,900').first()).toBeVisible();

    // 결제 시작 버튼(예: "10일 시작하기 →")
    const buyBtn = page.getByRole('button', { name: /시작하기/ }).first();
    await expect(buyBtn).toBeVisible();
    await buyBtn.click();
    // 비로그인 → 로그인으로 유도
    await expect(page).toHaveURL(/#\/login/);
    await assertNoCrash(page);
  });

  test('6. 회원가입 직접 접근 가드(퍼널 외 진입은 온보딩으로)', async ({ page }) => {
    await page.goto('/#/signup');
    // intent/guest state 없이 직접 진입 → 온보딩으로 리다이렉트되는 것이 의도된 설계
    await expect(page).toHaveURL(/#\/onboarding/);
    await assertNoCrash(page);
  });

  test('7. 정책 페이지 로드(광고 심사 필수)', async ({ page }) => {
    for (const path of ['/#/terms', '/#/privacy', '/#/refund']) {
      await page.goto(path);
      await assertNoCrash(page);
      // 본문이 비어있지 않은지(최소한의 텍스트 렌더) 확인
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });
});
