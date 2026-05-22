export type ClarityConfigInput = {
  projectId?: string;
  hostname?: string;
};

export type ClarityConfig =
  | { enabled: true; projectId: string }
  | { enabled: false; reason: 'missing-project-id' | 'local-development' };

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

export function resolveClarityConfig(input: ClarityConfigInput): ClarityConfig {
  const projectId = input.projectId?.trim();
  if (!projectId) {
    return { enabled: false, reason: 'missing-project-id' };
  }

  const hostname = input.hostname?.toLowerCase();
  if (hostname && (LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith('.local'))) {
    return { enabled: false, reason: 'local-development' };
  }

  return { enabled: true, projectId };
}

export function buildClarityScriptUrl(projectId: string): string {
  return `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
}
