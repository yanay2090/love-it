'use client';

import { supabasePublishableKey } from '@love-it/shared';
import { createClient } from '@supabase/supabase-js';
import { type FormEvent, useState } from 'react';
import { track } from '../lib/analytics';

const SUCCESS = "You're on the list. We'll email you when Love it launches in Tel Aviv.";

function validEmail(value: string): boolean {
  return value.length >= 3 && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'saving' || status === 'done') return;

    if (company.trim()) {
      setStatus('done');
      setMessage(SUCCESS);
      return;
    }

    const next = email.trim().toLowerCase();
    if (!validEmail(next)) {
      setStatus('error');
      setMessage('Enter a valid email address.');
      return;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabasePublishableKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    if (!url || !key) {
      setStatus('error');
      setMessage("We couldn't save that just now. Try again in a moment.");
      return;
    }

    setStatus('saving');
    setMessage(null);
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.from('waitlist').insert({ email: next, source: 'loveitapp.com' });
    const duplicate = Boolean(error && (error.code === '23505' || /duplicate key/i.test(error.message)));
    if (error && !duplicate) {
      setStatus('error');
      setMessage("We couldn't save that just now. Try again in a moment.");
      return;
    }
    if (!error) track('waitlist_joined', { source: 'placeholder' });
    setStatus('done');
    setMessage(SUCCESS);
  }

  if (status === 'done') {
    return <p className="waitlist-status">{message}</p>;
  }

  return (
    <>
      <form className="waitlist" onSubmit={(event) => void onSubmit(event)}>
        <label htmlFor="waitlist-email">Email</label>
        <input
          id="waitlist-email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@gmail.com"
          value={email}
          maxLength={254}
          required
          disabled={status === 'saving'}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label className="hp" htmlFor="waitlist-company">
          Company
          <input
            id="waitlist-company"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>
        <button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Sending…' : 'Notify me'}
        </button>
      </form>
      {message ? <p className="waitlist-status error">{message}</p> : null}
      <p className="muted">
        We&apos;ll only use your email to tell you when Love it launches.{' '}
        <a href="/privacy">Privacy</a>
      </p>
    </>
  );
}
