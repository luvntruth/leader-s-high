# Growth Events

## 이벤트 정의

- `landing_variant_view`
  - 랜딩 진입 시 기록
  - 속성: `variant`, `lp`, `utm_source`, `utm_campaign`, `utm_adset`, `utm_content`, `persona`, `angle`

- `cta_click`
  - 랜딩 CTA 클릭 시 기록
  - 속성: `placement`, `target`, `variant`, `lp`, UTM 관련 값들

- `pricing_view`
  - 가격 페이지 진입 시 기록
  - 속성: `current_plan`, `is_logged_in`, `lp`, UTM 관련 값들

- `checkout_start`
  - 결제 버튼 클릭 직전 기록
  - 속성: `option_id`, `plan`, `days`, `amount`, `lp`, UTM 관련 값들

- `checkout_success`
  - 결제 요청이 성공으로 반환된 시점에 기록
  - 속성: `option_id`, `plan`, `days`, `amount`, `lp`, UTM 관련 값들

- `simulation_first_turn`
  - 시뮬레이션에서 사용자가 첫 발화를 보낸 시점에 기록
  - 속성: `scenario_id`, `guest`, `plan`

## 대표 퍼널

1. `landing_variant_view`
2. `cta_click`
3. `pricing_view`
4. `checkout_start`
5. `checkout_success`

## 창업자가 먼저 볼 지표

- 랜딩 CTR
  - `cta_click / landing_variant_view`
  - variant별 비교가 가장 중요

- 가격 페이지 전환율
  - `checkout_start / pricing_view`
  - 가격/오퍼 저항 확인용

- 결제 완료율
  - `checkout_success / checkout_start`
  - 결제 UX 문제나 신뢰 문제 확인용

- 실사용 진입률
  - `simulation_first_turn / signup_complete` 또는 `simulation_first_turn / checkout_success`
  - 결제 후 실제 사용으로 이어지는지 확인

## 해석 팁

- `lp`별 성과 차이가 크면 메시지 차별화가 먹히는 상태입니다.
- `utm_campaign` 성과가 좋아도 `checkout_success`가 낮으면 광고보다 오퍼/결제 흐름 문제일 가능성이 큽니다.
- `simulation_first_turn`이 낮으면 구매 후 첫 경험 진입이 막히는 것입니다. 온보딩과 첫 화면을 먼저 점검해야 합니다.
