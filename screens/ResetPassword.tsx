import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '../services/authService';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.resetPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '비밀번호 재설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-white mb-1">
            <span className="text-amber-500">Letmefree</span>
          </div>
          <p className="text-slate-400 text-sm">비밀번호 재설정</p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 성공 메시지 */}
        {success ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              비밀번호 재설정 링크가 이메일로 전송되었습니다.
            </div>
            <div className="text-center">
              <Link to="/login" className="text-amber-500 text-sm hover:text-amber-400 transition-colors">
                로그인으로 돌아가기
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* 재설정 폼 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '전송 중...' : '비밀번호 재설정 링크 보내기'}
              </button>
            </form>

            {/* 하단 링크 */}
            <div className="mt-6 text-center">
              <Link to="/login" className="text-amber-500 text-sm hover:text-amber-400 transition-colors">
                로그인으로 돌아가기
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
