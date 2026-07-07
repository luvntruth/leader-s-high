import { useNavigate } from 'react-router-dom';
import PolicyFooter from '../components/PolicyFooter';
import { BUSINESS_INFO, PAID_PRODUCTS } from '../src/lib/businessInfo';

const REFUND_RULES = [
  {
    title: '기간제 이용권',
    items: [
      '결제 후 서비스를 전혀 이용하지 않은 경우 결제일로부터 7일 이내 전액 환불을 요청할 수 있습니다.',
      '서비스 이용을 시작한 후에는 이용 기간, 사용한 시나리오/리포트, 제공 완료된 디지털 콘텐츠를 기준으로 부분 환불될 수 있습니다.',
      '이용 기간이 종료되었거나 제공된 이용권을 대부분 사용한 경우 환불이 제한될 수 있습니다.',
    ],
  },
  {
    title: '전문가 코칭 플레이북 단건 구매',
    items: [
      '결제 후 플레이북이 생성·열람·저장되기 전에는 전액 환불을 요청할 수 있습니다.',
      'AI 분석 결과, 플레이북, 스크립트 등 디지털 콘텐츠가 생성 또는 열람 완료된 뒤에는 콘텐츠 특성상 환불이 제한될 수 있습니다.',
      '기술 오류로 플레이북이 제공되지 않은 경우 고객센터 확인 후 재제공 또는 환불을 진행합니다.',
    ],
  },
  {
    title: '환불 처리',
    items: [
      `환불 요청은 ${BUSINESS_INFO.refundRequestEmail}로 접수해 주세요.`,
      '접수 시 가입 이메일, 결제 상품명, 결제 일시, 환불 사유를 함께 알려주세요.',
      '카드 결제 취소는 승인 후 카드사 정책에 따라 영업일 기준 3~7일 정도 소요될 수 있습니다.',
      '관계 법령상 청약철회 제한 사유가 있는 경우 환불이 제한될 수 있습니다.',
    ],
  },
];

export default function Refund() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <main className="mx-auto max-w-3xl px-4 py-12 pb-16">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-amber-400/80">Refund Policy</p>
        <h1 className="mb-4 text-2xl font-bold text-white">환불정책</h1>
        <p className="mb-8 leading-7 text-slate-400">
          {BUSINESS_INFO.serviceName}는 AI 리더십 시뮬레이션, 기간제 이용권, 전문가 코칭 플레이북을 제공하는 디지털 서비스입니다.
          아래 기준에 따라 환불 요청을 처리합니다.
        </p>

        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">판매 상품</h2>
          <div className="space-y-4">
            {PAID_PRODUCTS.map(product => (
              <div key={product.name} className="border-b border-white/[0.06] pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-100">{product.name}</h3>
                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">{product.price}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">제공 기간: {product.period}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{product.description}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          {REFUND_RULES.map(section => (
            <section key={section.title}>
              <h2 className="mb-3 text-lg font-semibold text-white">{section.title}</h2>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-400">
                {section.items.map(item => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm leading-6 text-amber-100/90">
          <h2 className="mb-2 font-semibold text-amber-300">안내</h2>
          <p>
            AI 분석 결과는 사용자의 입력과 대화 내용에 따라 생성되는 디지털 콘텐츠입니다. 단순 변심 환불은 콘텐츠 제공 여부와 이용 이력을 기준으로 판단합니다.
          </p>
        </section>

        {/* 카카오 채널 환불 문의 CTA */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
          <p className="text-slate-300 text-sm font-semibold mb-1">환불 문의는 카카오톡 채널이 가장 빠릅니다</p>
          <p className="text-slate-500 text-xs mb-4">가입 이메일·결제 상품명·결제 일시·환불 사유를 함께 남겨주세요</p>
          <a
            href={BUSINESS_INFO.customerSupportKakao}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl bg-[#FEE500] text-slate-900 font-black text-sm px-6 py-3 hover:brightness-95 transition-all"
          >
            카카오톡으로 문의하기
          </a>
          <p className="mt-3 text-slate-600 text-xs">이메일 문의: {BUSINESS_INFO.refundRequestEmail}</p>
        </section>

        <p className="mt-8 text-xs text-slate-500">최종 업데이트: {BUSINESS_INFO.policyUpdatedAt}</p>
        <button onClick={() => navigate(-1)} className="mt-8 text-sm text-slate-500 transition-colors hover:text-slate-300">← 돌아가기</button>
      </main>
      <PolicyFooter />
    </div>
  );
}
