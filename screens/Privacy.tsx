import { useNavigate } from 'react-router-dom';

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 pb-24 lg:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-white mb-8">개인정보처리방침</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-300">
          <section>
            <h2 className="text-white text-lg font-semibold">1. 수집하는 개인정보</h2>
            <p>Letmefree는 서비스 제공을 위해 다음 정보를 수집합니다:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>이메일 주소 (회원가입 및 로그인)</li>
              <li>이름 (프로필 표시)</li>
              <li>시뮬레이션 대화 기록 (AI 피드백 생성)</li>
              <li>리더십 역량 점수 (성장 분석)</li>
            </ul>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold">2. 개인정보의 이용 목적</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>AI 리더십 코칭 서비스 제공</li>
              <li>사용자 맞춤형 피드백 및 성장 리포트 생성</li>
              <li>서비스 개선 및 품질 향상</li>
              <li>고객 지원 및 문의 응대</li>
            </ul>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold">3. 개인정보의 보관 및 파기</h2>
            <p>회원 탈퇴 시 모든 개인정보를 즉시 파기합니다. 관련 법령에 따라 일정 기간 보관이 필요한 정보는 해당 기간 동안만 보관합니다.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold">4. 데이터 내보내기 및 삭제</h2>
            <p>사용자는 프로필 {'>'} 계정 탭에서 언제든지 자신의 데이터를 JSON 형식으로 내보내거나 계정을 삭제할 수 있습니다.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold">5. 제3자 서비스</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Google Gemini AI (Vertex AI) — 대화 분석 및 피드백 생성</li>
              <li>Supabase — 데이터 저장 및 인증</li>
              <li>포트원(PortOne) — 결제 처리</li>
              <li>Sentry — 에러 추적 (비식별 데이터만)</li>
            </ul>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold">6. 문의</h2>
            <p>개인정보 관련 문의: <a href="mailto:privacy@letmefree.app" className="text-amber-500">privacy@letmefree.app</a></p>
          </section>
          <p className="text-slate-500 text-xs">최종 업데이트: 2026년 3월 21일</p>
        </div>
        <button onClick={() => navigate(-1)} className="mt-8 text-slate-500 text-sm hover:text-slate-400">← 돌아가기</button>
      </div>
    </div>
  );
}
