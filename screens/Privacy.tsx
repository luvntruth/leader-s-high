import { useNavigate } from 'react-router-dom';
import PolicyFooter from '../components/PolicyFooter';
import { BUSINESS_INFO } from '../src/lib/businessInfo';

const PROCESSORS = [
  ['Supabase', '회원 인증, 데이터 저장, 서비스 운영 데이터 관리'],
  ['Google Gemini / Vertex AI', 'AI 대화 응답, 피드백 및 코칭 콘텐츠 생성'],
  ['포트원(PortOne)', '결제창 호출, 결제 승인 및 거래 식별 정보 처리'],
  ['토스페이먼츠', '카드 결제 승인, 취소, 정산, 구매안전서비스 등 결제대행 업무'],
  ['Sentry', '서비스 오류 추적 및 안정성 개선을 위한 비식별 오류 로그 처리'],
  ['Microsoft Clarity', '세션 리플레이, 히트맵, 클릭·스크롤 등 행동 분석을 통한 서비스 개선 및 광고 성과 분석'],
] as const;

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <main className="mx-auto max-w-3xl px-4 py-12 pb-16">
        <h1 className="mb-8 text-2xl font-bold text-white">개인정보처리방침</h1>
        <div className="space-y-7 text-sm leading-7 text-slate-300">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">1. 수집하는 개인정보</h2>
            <p className="mb-2">{BUSINESS_INFO.serviceName}는 서비스 제공을 위해 다음 정보를 수집할 수 있습니다.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>회원 정보: 이메일 주소, 이름 또는 표시명, 로그인 식별자</li>
              <li>서비스 이용 정보: 시뮬레이션 대화 기록, 선택 시나리오, 피드백 리포트, 리더십 역량 점수, 이용권 상태</li>
              <li>결제 정보: 구매 상품명, 결제 금액, 결제 일시, 거래 ID, 결제 승인번호, 환불 처리 이력</li>
              <li>기술 정보: 접속 로그, 기기/브라우저 정보, IP 주소, 오류 로그, 쿠키 또는 유사 식별자</li>
              <li>행동분석 정보: 광고 유입 경로, 랜딩 페이지 방문·클릭·스크롤·이탈 정보, 세션 리플레이 및 히트맵 분석 정보</li>
            </ul>
            <p className="mt-2 text-slate-500">카드번호 등 민감한 결제수단 원문은 회사가 직접 저장하지 않고 결제대행사를 통해 처리됩니다.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">2. 개인정보의 이용 목적</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>회원가입, 로그인, 계정 관리</li>
              <li>AI 리더십 시뮬레이션, 피드백, 전문가 코칭 플레이북 제공</li>
              <li>유료 상품 결제, 구매내역 확인, 환불 및 고객 지원</li>
              <li>서비스 품질 개선, 장애 대응, 부정 이용 방지</li>
              <li>광고 유입 경로와 랜딩 페이지 행동 분석을 통한 서비스 개선 및 광고 성과 분석</li>
              <li>법령상 의무 이행 및 분쟁 대응</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">3. 개인정보의 보관 및 파기</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>회원 정보와 서비스 이용 기록은 회원 탈퇴 또는 목적 달성 시 지체 없이 파기합니다.</li>
              <li>결제·환불·거래 기록은 전자상거래 등 관련 법령에 따라 일정 기간 보관될 수 있습니다.</li>
              <li>법령상 보관이 필요한 정보는 해당 기간 동안 분리 보관 후 파기합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">4. 개인정보 처리 위탁 및 제3자 서비스</h2>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-white/[0.04] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">수탁자/서비스</th>
                    <th className="px-4 py-3">처리 목적</th>
                  </tr>
                </thead>
                <tbody>
                  {PROCESSORS.map(([name, purpose]) => (
                    <tr key={name} className="border-t border-white/[0.06]">
                      <td className="px-4 py-3 font-semibold text-white">{name}</td>
                      <td className="px-4 py-3">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-slate-500">
              각 외부 서비스는 서비스 제공에 필요한 범위 내에서만 정보를 처리합니다. 국외 서비스 이용 시 해당 서비스의 보안 및 개인정보 처리 기준을 확인하고 필요한 보호 조치를 적용합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">5. 이용자의 권리</h2>
            <p>
              이용자는 자신의 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다. 서비스 내 계정 기능 또는 개인정보 문의 이메일을 통해 요청할 수 있으며,
              회사는 관련 법령에 따라 지체 없이 처리합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">6. 쿠키와 분석 정보</h2>
            <p>
              서비스는 로그인 유지, 이용 흐름 분석, 오류 추적을 위해 쿠키 또는 유사 기술을 사용할 수 있습니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나,
              이 경우 일부 기능 이용이 제한될 수 있습니다.
            </p>
            <p className="mt-2 text-slate-500">
              광고 집행 및 서비스 개선을 위해 Microsoft Clarity 등 행동분석 도구를 사용할 수 있으며, 이 경우 세션 리플레이, 히트맵, 클릭·스크롤·이탈 정보가 비밀번호,
              결제수단 원문 등 민감정보를 제외한 범위에서 분석될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">7. 개인정보보호책임자 및 문의</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>개인정보보호책임자: {BUSINESS_INFO.privacyOfficer}</li>
              <li>개인정보 문의: <a href={`mailto:${BUSINESS_INFO.privacyEmail}`} className="text-amber-400 hover:underline">{BUSINESS_INFO.privacyEmail}</a></li>
              <li>서비스/결제 문의: <a href={`mailto:${BUSINESS_INFO.customerSupportEmail}`} className="text-amber-400 hover:underline">{BUSINESS_INFO.customerSupportEmail}</a></li>
            </ul>
          </section>

          <p className="text-xs text-slate-500">최종 업데이트: {BUSINESS_INFO.policyUpdatedAt}</p>
        </div>
        <button onClick={() => navigate(-1)} className="mt-8 text-sm text-slate-500 transition-colors hover:text-slate-300">← 돌아가기</button>
      </main>
      <PolicyFooter />
    </div>
  );
}
