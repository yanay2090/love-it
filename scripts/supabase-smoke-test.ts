/**
 * Sign up a throwaway email user against the configured Supabase project.
 *
 *   SMOKE_TEST_EMAIL=you@gmail.com npm run supabase:smoke
 *   npm run supabase:smoke -- you@gmail.com
 *
 * The address must be a real inbox. Supabase Auth rejects example.com.
 * A random +tag is inserted before the @ (you+smokeabc@gmail.com) so each run
 * is a new user. A signup that creates the user but returns no session is a
 * pass: that happens when Confirm email is on.
 *
 * URL:  SUPABASE_URL, else NEXT_PUBLIC_SUPABASE_URL, else EXPO_PUBLIC_SUPABASE_URL
 * Key:  SUPABASE_PUBLISHABLE_KEY, else NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
 *       else EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * The key must be the publishable key (`sb_publishable_...`).
 * `sb_secret_` keys must never ship in client code and are refused here too.
 *
 * Loads `.env`, `.env.local`, `apps/web/.env.local`, and `apps/mobile/.env`
 * without overriding variables already set in the environment. A CLI address
 * wins over SMOKE_TEST_EMAIL.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_FILES = ['.env', '.env.local', 'apps/web/.env.local', 'apps/mobile/.env'];

function loadEnvFiles(): void {
  for (const relative of ENV_FILES) {
    const path = resolve(process.cwd(), relative);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const name = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[name] === undefined) process.env[name] = value;
    }
  }
}

function firstSet(names: string[]): { name: string; value: string } | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return { name, value };
  }
  return null;
}

function fail(message: string): never {
  console.error(`supabase smoke test: ${message}`);
  process.exit(1);
}

const EMAIL_HELP =
  'Set SMOKE_TEST_EMAIL to an inbox Supabase will accept (not example.com), or pass it as an argument.\n' +
  '  SMOKE_TEST_EMAIL=you@gmail.com npm run supabase:smoke\n' +
  '  npm run supabase:smoke -- you@gmail.com';

/** CLI address (`-- you@gmail.com` or `--email you@gmail.com`) wins over the env var. */
function emailFromArgs(argv: string[]): string | null {
  const args = argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? '';
    if (arg === '--email' || arg === '--smoke-email') {
      const next = args[index + 1];
      if (!next || next.startsWith('-')) fail(`missing address after ${arg}.\n${EMAIL_HELP}`);
      return next;
    }
    if (arg.startsWith('--email=')) return arg.slice('--email='.length);
    if (arg.startsWith('--smoke-email=')) return arg.slice('--smoke-email='.length);
    if (!arg.startsWith('-') && arg.includes('@')) return arg;
  }
  return null;
}

/** you@gmail.com → you+smoke<random>@gmail.com */
function taggedEmail(base: string): string {
  const trimmed = base.trim();
  const at = trimmed.lastIndexOf('@');
  const local = at > 0 ? trimmed.slice(0, at) : '';
  const domain = at > 0 ? trimmed.slice(at + 1) : '';
  const localBase = local.split('+')[0] ?? '';
  if (!localBase || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    fail(`"${trimmed}" is not a usable email.\n${EMAIL_HELP}`);
  }
  if (domain.toLowerCase() === 'example.com') {
    fail(`Supabase Auth rejects example.com.\n${EMAIL_HELP}`);
  }
  const tag = `smoke${Date.now().toString(36)}`;
  return `${localBase}+${tag}@${domain}`;
}

async function main(): Promise<void> {
  loadEnvFiles();

  const url = firstSet(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL']);
  const key = firstSet([
    'SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ]);

  if (!url) {
    fail('set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL).');
  }
  if (!key) {
    fail(
      'set SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Use the sb_publishable_ key. sb_secret_ keys must never ship in client code.',
    );
  }
  if (key.value.startsWith('sb_secret_')) {
    fail('refusing to run with an sb_secret_ key. sb_secret_ keys must never ship in client code. Use sb_publishable_....');
  }
  if (!key.value.startsWith('sb_publishable_')) {
    fail(`the key in ${key.name} is not a publishable key. Expected sb_publishable_.... sb_secret_ keys must never ship in client code.`);
  }

  const baseEmail = emailFromArgs(process.argv) ?? process.env.SMOKE_TEST_EMAIL?.trim() ?? '';
  if (!baseEmail) fail(EMAIL_HELP);

  const project = url.value.replace(/\/$/, '');
  const email = taggedEmail(baseEmail);
  const stamp = email.slice(email.indexOf('+') + 1, email.lastIndexOf('@')).replace(/[^a-z0-9]/gi, '');
  const password = `Loveit-${stamp}-Smoke1`;
  const handle = `smoke_${stamp}`.slice(0, 30);

  console.log('supabase smoke test');
  console.log(`project: ${project}`);
  console.log(`key: ${key.name} (sb_publishable_)`);
  console.log(`email: ${email}`);

  let response: Response;
  try {
    response = await fetch(`${project}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: key.value,
        Authorization: `Bearer ${key.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        data: { handle, display_name: 'Smoke test' },
      }),
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : 'request failed');
  }

  const body = (await response.json().catch(() => null)) as {
    id?: string;
    user?: { id?: string } | null;
    session?: { access_token?: string } | null;
    access_token?: string;
    msg?: string;
    message?: string;
    error_description?: string;
    error?: string;
  } | null;

  const userId = body?.user?.id ?? body?.id;
  if (!response.ok || !userId) {
    const detail = body?.msg || body?.message || body?.error_description || body?.error || response.statusText;
    fail(`signup failed (${response.status}): ${detail}`);
  }

  const sessionToken = body?.session?.access_token || body?.access_token;
  console.log('result: success');
  console.log(`user_id: ${userId}`);
  if (sessionToken) {
    console.log('session: created');
    return;
  }
  console.log('session: none');
  console.log(
    'Confirm email is on in the Supabase dashboard (Authentication → Sign In / Providers → Email → Confirm email), so Auth created the user and did not return a session. That is a pass. Turn Confirm email off if this script should also receive a session.',
  );
}

void main();
