import { APP_ORIGIN, PRIVACY_EMAIL, SUPPORT_EMAIL } from './brand';

export const BUSINESS_INFO = {
  serviceName: 'Letmefree',
  companyName: '휴머니스틱',
  representative: '이석진',
  businessRegistrationNumber: '101-23-09282',
  mailOrderSalesNumber: '제 2026-서울양천-0626 호',
  businessAddress: '서울특별시 양천구 목동동로12길 60, 103동 1202호 (신정동, 목동현대아파트)',
  customerSupportEmail: SUPPORT_EMAIL,
  customerSupportPhone: '010-4488-9517',
  privacyEmail: PRIVACY_EMAIL,
  customerSupportChannel: SUPPORT_EMAIL,
  privacyOfficer: '이석진',
  refundRequestEmail: SUPPORT_EMAIL,
  appOrigin: APP_ORIGIN,
  policyUpdatedAt: '2026년 5월 18일',
} as const;

export const PAID_PRODUCTS = [
  {
    name: '프로 10일 이용권',
    price: '8,900원',
    period: '결제일로부터 10일',
    description: '20개 리더십 시나리오 선택, 시나리오당 최대 3회 도전, 풀 리포트와 기록 비교를 제공합니다.',
  },
  {
    name: '프로 20일 이용권',
    price: '13,500원',
    period: '결제일로부터 20일',
    description: '프로 기능을 20일 동안 이용할 수 있는 기간제 이용권입니다.',
  },
  {
    name: '울트라 30일 이용권',
    price: '29,900원',
    period: '결제일로부터 30일',
    description: '40개 전체 시나리오, 시나리오당 최대 5회 도전, 풀 리포트, 기록 비교, 타인 비교 분석, 커스텀 랩을 제공합니다.',
  },
  {
    name: '전문가 코칭 플레이북',
    price: '3,900원',
    period: '단건 구매 후 계정 내 보관',
    description: '완료한 시뮬레이션을 바탕으로 3단계 대화 전략, 상황별 핵심 문장, 심리적 트리거 분석, 리더십 코치 총평을 제공합니다.',
  },
] as const;
