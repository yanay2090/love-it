/**
 * Sign up a throwaway email user against the configured Supabase project.
 *
 *   npm run supabase:smoke
 *
 * URL:  SUPABASE_URL, else NEXT_PUBLIC_SUPABASE_URL, else EXPO_PUBLIC_SUPABASE_URL
 * Key:  SUPABASE_PUBLISHABLE_KEY, else NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
 *       else EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * The key must be the publishable key (`sb_publishable_...`).
 * `sb_secret_` keys must never ship in client code and are refused here too.
 *
 * Loads `.env`, `.env.local`, `apps/web/.env.local`, and `apps/mobile/.env`
 * without overriding variables already set in the environment.
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

  const project = url.value.replace(/\/$/, '');
  const stamp = Date.now().toString(36);
  const email = `smoke+${stamp}@example.com`;
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
    user?: { id?: string };
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

  console.log('result: success');
  console.log(`user_id: ${userId}`);
  console.log(body?.access_token ? 'session: created' : 'session: none (email confirmation may be required)');
}

void main();
