import { buildClarityScriptUrl, resolveClarityConfig } from '../src/lib/clarityConfig';

const CLARITY_SCRIPT_ID = 'ms-clarity-script';

type ClarityFunction = ((...args: unknown[]) => void) & { q?: unknown[] };

declare global {
  interface Window {
    clarity?: ClarityFunction;
  }
}

export function initMicrosoftClarity(projectId: string | undefined): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const config = resolveClarityConfig({ projectId, hostname: window.location.hostname });
  if (!config.enabled) return;

  if (document.getElementById(CLARITY_SCRIPT_ID)) return;

  window.clarity = window.clarity || function clarityStub(...args: unknown[]) {
    (window.clarity!.q = window.clarity!.q || []).push(args);
  };

  const script = document.createElement('script');
  script.id = CLARITY_SCRIPT_ID;
  script.async = true;
  script.src = buildClarityScriptUrl(config.projectId);
  document.head.appendChild(script);
}
