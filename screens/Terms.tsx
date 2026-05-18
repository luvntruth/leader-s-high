import { useNavigate } from 'react-router-dom';
import PolicyFooter from '../components/PolicyFooter';
import { BUSINESS_INFO, PAID_PRODUCTS } from '../src/lib/businessInfo';

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <main className="mx-auto max-w-3xl px-4 py-12 pb-16">
        <h1 className="mb-8 text-2xl font-bold text-white">이용약관</h1>
        <div className="space-y-7 text-sm leading-7 text-slate-300">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">1. 서비스 개요</h2>
            <p>
              {BUSINESS_INFO.serviceName}(이하 “서비스”)는 AI 기반 리더십 대화 시뮬레이션, 피드백 리포트, 전문가 코칭 플레이북을 제공하는 디지털 훈련 서비스입니다.
              사용자는 AI 팀원과의 대화를 통해 리더십 커뮤니케이션을 연습하고, 대화 결과에 대한 피드백을 확인할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">2. 이용 자격과 계정</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>만 14세 이상의 개인 또는 법인이 서비스를 이용할 수 있습니다.</li>
              <li>회원은 본인의 정확한 이메일과 계정 정보를 사용해야 하며, 계정 관리 책임은 회원에게 있습니다.</li>
              <li>타인의 계정을 도용하거나 서비스를 부정하게 이용하는 행위는 제한될 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">3. 유료서비스와 결제</h2>
            <p className="mb-3">서비스는 무료 체험과 아래 유료 상품을 제공합니다.</p>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-white/[0.04] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">상품</th>
                    <th className="px-4 py-3">가격</th>
                    <th className="px-4 py-3">제공 기간</th>
                    <th className="px-4 py-3">주요 내용</th>
                  </tr>
                </thead>
                <tbody>
                  {PAID_PRODUCTS.map(product => (
                    <tr key={product.name} className="border-t border-white/[0.06]">
                      <td className="px-4 py-3 font-semibold text-white">{product.name}</td>
                      <td className="px-4 py-3">{product.price}</td>
                      <td className="px-4 py-3">{product.period}</td>
                      <td className="px-4 py-3">{product.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>유료 상품은 별도 표시가 없는 한 자동 갱신되지 않는 기간제 또는 단건 상품입니다.</li>
              <li>결제는 포트원, 토스페이먼츠 등 결제대행사를 통해 처리될 수 있습니다.</li>
              <li>결제 완료 후 이용권은 회원 계정에 반영되며, 플레이북은 구매한 계정 내에서 확인할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">4. 환불과 청약철회</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>환불은 별도 <a href="#/refund" className="text-amber-400 hover:underline">환불정책</a>에 따릅니다.</li>
              <li>기간제 이용권은 결제 후 이용 여부, 경과 기간, 제공 완료된 콘텐츠를 기준으로 환불 가능 여부와 금액이 산정됩니다.</li>
              <li>AI 리포트, 전문가 코칭 플레이북 등 디지털 콘텐츠가 생성·열람·저장 완료된 경우 콘텐츠 특성상 환불이 제한될 수 있습니다.</li>
              <li>서비스 장애나 기술 오류로 유료 콘텐츠가 정상 제공되지 않은 경우 재제공 또는 환불을 요청할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">5. AI 생성 콘텐츠</h2>
            <p>
              서비스에서 생성되는 AI 피드백, 코칭 결과, 플레이북은 리더십 훈련을 위한 참고 자료입니다. AI 결과의 완전성·정확성을 보장하지 않으며,
              법률, 의료, 심리상담, 인사노무 자문 등 전문적 판단을 대체하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">6. 사용 제한</h2>
            <p>
              회사는 서비스 악용, 비정상적인 자동화 접근, 타인 권리 침해, 불법적 목적의 사용, 시스템 안정성을 해치는 행위를 제한할 수 있습니다.
              각 플랜의 시나리오 수, 시도 횟수, 이용 기간은 상품 안내에 따릅니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">7. 약관 변경</h2>
            <p>
              약관이 변경되는 경우 서비스 화면 또는 이메일 등 적절한 방법으로 고지합니다. 변경 약관의 효력 발생 후에도 서비스를 계속 이용하면 변경에 동의한 것으로 봅니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">8. 문의</h2>
            <p>
              서비스, 결제, 환불 관련 문의: <a href={`mailto:${BUSINESS_INFO.customerSupportEmail}`} className="text-amber-400 hover:underline">{BUSINESS_INFO.customerSupportEmail}</a>
            </p>
          </section>

          <p className="text-xs text-slate-500">최종 업데이트: {BUSINESS_INFO.policyUpdatedAt}</p>
        </div>
        <button onClick={() => navigate(-1)} className="mt-8 text-sm text-slate-500 transition-colors hover:text-slate-300">← 돌아가기</button>
      </main>
      <PolicyFooter />
    </div>
  );
}
