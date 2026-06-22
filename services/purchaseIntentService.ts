import { analyticsService, type GrowthAttribution } from './analyticsService';
import { PAYMENT_OPTIONS, type PaymentOption } from './paymentService';

export const PENDING_PURCHASE_INTENT_KEY = 'lh_pending_purchase_intent';

export type PendingPurchaseIntent = {
  optionId: string;
  plan: PaymentOption['plan'];
  days: number;
  amount: number;
  source: string;
  loginRedirect: string;
  attribution: GrowthAttribution;
  createdAt: string;
};

function normalizeAppPath(path: string): string {
  if (!path) return '/pricing';
  if (path.startsWith('#')) return path.slice(1) || '/pricing';
  if (path.startsWith('/')) return path;
  return `/${path}`;
}

export function buildPurchaseRedirectPath(basePath: string, attribution: GrowthAttribution, optionId: string): string {
  const [rawPath, rawQuery = ''] = normalizeAppPath(basePath).split('?');
  const params = new URLSearchParams(rawQuery);

  Object.entries(attribution).forEach(([key, value]) => {
    if (value && !params.has(key)) params.set(key, String(value));
  });
  params.set('intent', 'purchase');
  params.set('option', optionId);

  const query = params.toString();
  return query ? `${rawPath}?${query}` : rawPath;
}

export function createPendingPurchaseIntent(option: PaymentOption, source: string, loginRedirect: string): PendingPurchaseIntent {
  const attribution = analyticsService.getAttribution();
  return {
    optionId: option.id,
    plan: option.plan,
    days: option.days,
    amount: option.amount,
    source,
    loginRedirect: buildPurchaseRedirectPath(loginRedirect || '/pricing', attribution, option.id),
    attribution,
    createdAt: new Date().toISOString(),
  };
}

export function savePendingPurchaseIntent(intent: PendingPurchaseIntent): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PENDING_PURCHASE_INTENT_KEY, JSON.stringify(intent));
}

export function loadPendingPurchaseIntent(): PendingPurchaseIntent | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_PURCHASE_INTENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingPurchaseIntent;
    if (!PAYMENT_OPTIONS.some(option => option.id === parsed.optionId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingPurchaseIntent(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(PENDING_PURCHASE_INTENT_KEY);
}

export function getPendingPurchaseLabel(intent: PendingPurchaseIntent): string {
  const planLabel = intent.plan === 'ultra' ? '울트라' : '프로';
  return `${planLabel} ${intent.days}일 · ₩${intent.amount.toLocaleString()}`;
}
