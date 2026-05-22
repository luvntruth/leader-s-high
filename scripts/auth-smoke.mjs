#!/usr/bin/env node
import dns from 'node:dns/promises';
import https from 'node:https';
import { URL } from 'node:url';

const DEFAULT_APP_URL = 'https://www.letmefree.xyz';
const DEFAULT_EMAIL = 'hermes-smoke-test@example.com';
const DEFAULT_PASSWORD = 'HermesSmokeTest!234567890';

function argValue(name) {
  const prefix = `${name}=`;
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex !== -1 && process.argv[exactIndex + 1]) return process.argv[exactIndex + 1];
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function redactSupabaseUrl(rawUrl) {
  if (!rawUrl) return '<empty>';
  try {
    const parsed = new URL(rawUrl);
    const [head, ...rest] = parsed.hostname.split('.');
    const masked = head.length <= 8 ? `${head.slice(0, 2)}***${head.slice(-2)}` : `${head.slice(0, 4)}***${head.slice(-4)}`;
    parsed.hostname = [masked, ...rest].join('.');
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return '<invalid-url>';
  }
}

function redactKey(key) {
  if (!key) return '<empty>';
  return `${key.slice(0, 4)}***${key.slice(-4)} (len=${key.length})`;
}

function validateSupabaseUrl(rawUrl) {
  if (!rawUrl) throw new Error('Missing Supabase URL. Pass --supabase-url or --app-url.');
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'https:') throw new Error('Supabase URL must use https://');
  const match = parsed.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
  if (!match) throw new Error(`Malformed Supabase host: ${redactSupabaseUrl(rawUrl)}`);
  return parsed;
}

function requestText(url, options = {}, body, safeLabel = String(url)) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', (error) => reject(new Error(error.code || error.message)));
    req.setTimeout(10_000, () => req.destroy(new Error(`Timeout requesting ${safeLabel}`)));
    if (body) req.write(body);
    req.end();
  });
}

function decodeJwtPayload(token) {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    return JSON.parse(Buffer.from(padded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function extractAnonKey(text) {
  const jwtCandidates = text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
  for (const token of jwtCandidates) {
    const payload = decodeJwtPayload(token);
    if (payload?.role === 'anon') return token;
  }
  return undefined;
}

async function discoverFromApp(appUrl) {
  const app = new URL(appUrl);
  const html = await requestText(app);
  if ((html.statusCode || 0) >= 400) throw new Error(`App HTML returned HTTP ${html.statusCode}`);

  const scriptPaths = [...html.text.matchAll(/<script[^>]+src=["']([^"']+\.js)["']/g)].map((m) => m[1]);
  if (scriptPaths.length === 0) throw new Error('No JS bundles found in app HTML.');

  for (const path of scriptPaths) {
    const scriptUrl = new URL(path, app).toString();
    const bundle = await requestText(scriptUrl, {}, undefined, new URL(scriptUrl).pathname);
    const urlMatch = bundle.text.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/g);
    const anonKey = extractAnonKey(bundle.text);
    if (urlMatch?.[0] && anonKey) return { supabaseUrl: urlMatch[0], anonKey, source: scriptUrl };
  }
  throw new Error('Could not discover Supabase URL and anon key from production bundle. Pass --supabase-url and --anon-key explicitly.');
}

async function main() {
  const appUrl = argValue('--app-url') || process.env.AUTH_SMOKE_APP_URL || DEFAULT_APP_URL;
  let supabaseUrl = argValue('--supabase-url') || process.env.VITE_SUPABASE_URL;
  let anonKey = argValue('--anon-key') || process.env.VITE_SUPABASE_ANON_KEY;
  const email = argValue('--email') || DEFAULT_EMAIL;
  const password = argValue('--password') || DEFAULT_PASSWORD;

  if (!supabaseUrl || !anonKey) {
    const discovered = await discoverFromApp(appUrl);
    supabaseUrl = supabaseUrl || discovered.supabaseUrl;
    anonKey = anonKey || discovered.anonKey;
    console.log(`[auth-smoke] discovered production auth config from bundle: ${new URL(discovered.source).pathname}`);
  }

  const parsed = validateSupabaseUrl(supabaseUrl);
  if (!anonKey) throw new Error('Missing Supabase anon key. Pass --anon-key or set VITE_SUPABASE_ANON_KEY.');

  console.log(`[auth-smoke] supabaseUrl=${redactSupabaseUrl(supabaseUrl)}`);
  console.log(`[auth-smoke] anonKey=${redactKey(anonKey)}`);

  let addresses;
  try {
    addresses = await dns.lookup(parsed.hostname, { all: true });
  } catch (error) {
    throw new Error(`DNS lookup failed for ${redactSupabaseUrl(supabaseUrl)}: ${error.code || error.message}`);
  }
  console.log(`[auth-smoke] dns=ok count=${addresses.length}`);

  const body = JSON.stringify({ email, password });
  let response;
  try {
    response = await requestText(`${parsed.origin}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    }, body, `${redactSupabaseUrl(supabaseUrl)}/auth/v1/token`);
  } catch (error) {
    throw new Error(`Auth API network failure: ${error.message}`);
  }

  let payload = {};
  try {
    payload = JSON.parse(response.text);
  } catch {
    throw new Error(`Auth API returned non-JSON response with status ${response.statusCode}`);
  }
  if (!response.statusCode || response.statusCode >= 500) {
    throw new Error(`Auth API returned server error status ${response.statusCode}`);
  }
  const code = payload.error_code || payload.code || payload.error || payload.msg || 'no-json-error-code';
  console.log(`[auth-smoke] fake-login=http-json-response status=${response.statusCode} code=${String(code).slice(0, 80)}`);
  console.log('[auth-smoke] PASS: Auth endpoint returned a JSON HTTP/API response; browser CORS/CSP still requires browser smoke coverage.');
}

main().catch((error) => {
  console.error(`[auth-smoke] FAIL: ${error.message}`);
  process.exit(1);
});
