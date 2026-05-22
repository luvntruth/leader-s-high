export type ResolveSupabaseAuthConfigInput = {
  url?: string;
  anonKey?: string;
  /**
   * 자체 호스팅한 Supabase(또는 GoTrue 호환) 도메인을 사용할 때 true로 설정합니다.
   * 기본값은 false 이며, *.supabase.co 만 허용합니다.
   */
  allowSelfHosted?: boolean;
};

export type SupabaseAuthConfigFailureReason =
  | 'missing-url'
  | 'missing-anon-key'
  | 'placeholder-url'
  | 'placeholder-anon-key'
  | 'invalid-url'
  | 'insecure-scheme'
  | 'malformed-project-ref'
  | 'non-supabase-host';

export type SupabaseAuthConfigResult =
  | {
      ok: true;
      url: string;
      anonKey: string;
      /** Supabase 프로젝트 ref (자체 호스팅인 경우 null). */
      projectRef: string | null;
    }
  | {
      ok: false;
      reason: SupabaseAuthConfigFailureReason;
      message: string;
    };

const PLACEHOLDER_URLS = new Set([
  'https://your-project.supabase.co',
  'https://placeholder.supabase.co',
  'https://xxxxx.supabase.co',
  'https://xxxx.supabase.co',
]);

const PLACEHOLDER_ANON_KEYS = new Set([
  'placeholder',
  'your_supabase_anon_key_here',
  'your-supabase-anon-key',
]);

const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;

function fail(
  reason: SupabaseAuthConfigFailureReason,
  message: string,
): SupabaseAuthConfigResult {
  return { ok: false, reason, message };
}

export function resolveSupabaseAuthConfig(
  input: ResolveSupabaseAuthConfigInput,
): SupabaseAuthConfigResult {
  const rawUrl = input.url?.trim();
  const rawAnonKey = input.anonKey?.trim();
  const allowSelfHosted = input.allowSelfHosted === true;

  if (!rawUrl) {
    return fail(
      'missing-url',
      'Supabase 환경변수 VITE_SUPABASE_URL이 설정되지 않았습니다. 배포 환경 변수를 확인하세요.',
    );
  }
  if (!rawAnonKey) {
    return fail(
      'missing-anon-key',
      'Supabase 환경변수 VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다. 배포 환경 변수를 확인하세요.',
    );
  }

  const normalizedUrl = rawUrl.replace(/\/+$/, '');

  if (PLACEHOLDER_URLS.has(normalizedUrl)) {
    return fail(
      'placeholder-url',
      'VITE_SUPABASE_URL이 예시(placeholder) 값입니다. 실제 Supabase 프로젝트 URL로 교체해 주세요.',
    );
  }
  if (PLACEHOLDER_ANON_KEYS.has(rawAnonKey)) {
    return fail(
      'placeholder-anon-key',
      'VITE_SUPABASE_ANON_KEY가 예시(placeholder) 값입니다. 실제 anon key로 교체해 주세요.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    return fail(
      'invalid-url',
      'VITE_SUPABASE_URL이 올바른 URL 형식이 아닙니다. 예: https://<project-ref>.supabase.co',
    );
  }

  if (parsed.protocol !== 'https:') {
    return fail(
      'insecure-scheme',
      'VITE_SUPABASE_URL은 반드시 https:// 로 시작해야 합니다.',
    );
  }

  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    return fail(
      'invalid-url',
      'VITE_SUPABASE_URL은 origin만 입력해야 합니다. 예: https://<project-ref>.supabase.co',
    );
  }

  const host = parsed.hostname.toLowerCase();
  const isSupabaseHost = host.endsWith('.supabase.co');

  if (!isSupabaseHost) {
    if (allowSelfHosted) {
      return {
        ok: true,
        url: normalizedUrl,
        anonKey: rawAnonKey,
        projectRef: null,
      };
    }
    return fail(
      'non-supabase-host',
      'VITE_SUPABASE_URL의 호스트가 *.supabase.co 가 아닙니다. 자체 호스팅이라면 allowSelfHosted 옵션을 활성화하세요.',
    );
  }

  const projectRef = host.slice(0, host.length - '.supabase.co'.length);
  if (!PROJECT_REF_PATTERN.test(projectRef)) {
    return fail(
      'malformed-project-ref',
      'VITE_SUPABASE_URL의 프로젝트 ref 형식이 올바르지 않습니다. 20자의 소문자/숫자 조합이어야 합니다.',
    );
  }

  return {
    ok: true,
    url: normalizedUrl,
    anonKey: rawAnonKey,
    projectRef,
  };
}

/**
 * Supabase URL을 로그/리포트에 안전하게 노출할 수 있는 형태로 마스킹합니다.
 * project ref의 중간 부분을 별표로 가립니다.
 */
export function redactSupabaseUrl(url: string | undefined | null): string {
  if (!url || !url.trim()) return '<empty>';
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return '<invalid-url>';
  }

  const host = parsed.hostname;
  const dot = host.indexOf('.');
  const head = dot === -1 ? host : host.slice(0, dot);
  const tail = dot === -1 ? '' : host.slice(dot);
  const masked =
    head.length <= 4
      ? '***'
      : head.length <= 8
        ? `${head.slice(0, 2)}***${head.slice(-2)}`
        : `${head.slice(0, 4)}***${head.slice(-4)}`;
  return `${parsed.protocol}//${masked}${tail}`;
}

/**
 * anon key를 로그용으로 마스킹합니다 (길이 정보만 유지).
 */
export function redactAnonKey(key: string | undefined | null): string {
  if (!key) return '<empty>';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '***';
  return `${trimmed.slice(0, 4)}***${trimmed.slice(-4)} (len=${trimmed.length})`;
}
