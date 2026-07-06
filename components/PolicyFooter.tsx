import { Link } from 'react-router-dom';
import { BUSINESS_INFO } from '../src/lib/businessInfo';

export default function PolicyFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80 px-5 py-8 text-xs text-slate-500">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap gap-x-4 gap-y-2 font-semibold text-slate-300">
          <Link to="/terms" className="hover:text-amber-400 transition-colors">이용약관</Link>
          <Link to="/privacy" className="hover:text-amber-400 transition-colors">개인정보처리방침</Link>
          <Link to="/refund" className="hover:text-amber-400 transition-colors">환불정책</Link>
          <a href={BUSINESS_INFO.customerSupportKakao} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">고객센터 (카카오톡)</a>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <p><span className="text-slate-400">상호</span> {BUSINESS_INFO.companyName}</p>
          <p><span className="text-slate-400">서비스명</span> {BUSINESS_INFO.serviceName}</p>
          <p><span className="text-slate-400">대표자</span> {BUSINESS_INFO.representative}</p>
          <p><span className="text-slate-400">사업자등록번호</span> {BUSINESS_INFO.businessRegistrationNumber}</p>
          <p><span className="text-slate-400">통신판매업 신고번호</span> {BUSINESS_INFO.mailOrderSalesNumber}</p>
          <p className="sm:col-span-2"><span className="text-slate-400">사업장 주소</span> {BUSINESS_INFO.businessAddress}</p>
          <p><span className="text-slate-400">고객센터</span>{' '}
            <a href={BUSINESS_INFO.customerSupportKakao} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">카카오톡 채널</a>
            {' · '}{BUSINESS_INFO.customerSupportEmail}
          </p>
          <p><span className="text-slate-400">전화번호</span> {BUSINESS_INFO.customerSupportPhone}</p>
          <p><span className="text-slate-400">개인정보보호책임자</span> {BUSINESS_INFO.privacyOfficer}</p>
        </div>

        <p className="leading-relaxed text-slate-600">
          {BUSINESS_INFO.serviceName}의 AI 코칭 결과는 리더십 훈련을 위한 참고 자료이며, 법률·의료·심리상담 등 전문 자문을 대체하지 않습니다.
          결제 및 환불 문의는{' '}
          <a href={BUSINESS_INFO.customerSupportKakao} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors underline">카카오톡 채널</a>
          {' '}또는 고객센터 이메일로 접수해 주세요.
        </p>
      </div>
    </footer>
  );
}
