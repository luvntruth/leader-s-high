import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { PlanType } from '../src/types/database';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'owner';
  requiredPlan?: PlanType;
}

const PLAN_RANK: Record<PlanType, number> = { free: 0, pro: 1, ultra: 2 };

export function AuthGuard({ children, requiredRole, requiredPlan }: AuthGuardProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // 로딩 중 — 스피너
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 비인증 → 홈이면 랜딩, 그 외는 로그인으로
  if (!user) {
    if (location.pathname === '/') {
      return <Navigate to="/landing" replace />;
    }
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 역할 불충분 → 홈으로
  if (requiredRole && profile) {
    const roleRank: Record<string, number> = { member: 0, admin: 1, owner: 2 };
    if ((roleRank[profile.role] || 0) < (roleRank[requiredRole] || 0)) {
      return <Navigate to="/" replace />;
    }
  }

  // 플랜 불충분 → 가격 페이지로
  if (requiredPlan && profile) {
    if (PLAN_RANK[profile.plan] < PLAN_RANK[requiredPlan]) {
      return <Navigate to="/pricing" replace />;
    }
  }

  return <>{children}</>;
}
