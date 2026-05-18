import { useNavigate } from 'react-router-dom';

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 pb-24 lg:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-white mb-8">이용약관</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-300">
          <section>
            <h2 className="text-white text-lg font-semibold">1. 서비스 개요</h2>
            <p>Letmefree(이하 "서비스")는 AI 기반 리더십 훈련 시뮬레이션 플랫폼입니다. 사용자는 AI 팀원과의 대화를 통해 리더십 역량을 향상시킬 수 있습니다.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold">2. 이용 자격</h2>
            <p>만 14세 이상의 개인 또는 법인이 서비스를 이용할 수 있습니다.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold">3. 구독 및 결제</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>무료(스타터) 플랜: 월 5회 시뮬레이션, 기본 기능</li>
              <li>프로 플랜: 월 ₩9,900, 자동 갱신</li>
              <li>엔터프라이즈: 별도 문의</li>
              <li>구독 취소는 다음 결제일 전까지 가능하며, 잔여 기간 동안 서비스를 이용할 수 있습니다.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold">4. 사용 제한</h2>
            <p>각 플랜에 따라 일일/월간 시뮬레이션 횟수가 제한됩니다. 서비스를 악의적으로 사용하거나 API를 무단으로 호출하는 행위는 금지됩니다.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold">5. AI 생성 콘텐츠</h2>
            <p>서비스에서 생성되는 AI 피드백, 코칭 결과는 참고용이며, 전문 상담이나 법적 조언을 대체하지 않습니다.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold">6. 면책 조항</h2>
            <p>서비스는 "있는 그대로" 제공되며, AI 분석 결과의 정확성을 보장하지 않습니다. 서비스 사용으로 인한 직간접적 손해에 대해 책임을 지지 않습니다.</p>
          </section>
          <section>
            <h2 className="text-white text-lg font-semibold">7. 문의</h2>
            <p>서비스 관련 문의: <a href="mailto:support@letmefree.app" className="text-amber-500">support@letmefree.app</a></p>
          </section>
          <p className="text-slate-500 text-xs">최종 업데이트: 2026년 3월 21일</p>
        </div>
        <button onClick={() => navigate(-1)} className="mt-8 text-slate-500 text-sm hover:text-slate-400">← 돌아가기</button>
      </div>
    </div>
  );
}
