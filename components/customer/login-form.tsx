'use client';

import Link from 'next/link';
import {useState, type FormEvent} from 'react';

import type {AccountMessages} from '@/lib/customer/messages';
import {normalizeLoginName} from '@/lib/customer/auth-ui-core.mjs';

type LoginCopy = AccountMessages['login'];

export function LoginForm({
  locale,
  copy,
  initialUsername = '',
  returnTo,
  registered = false
}: {
  locale: 'ko' | 'en';
  copy: LoginCopy;
  initialUsername?: string;
  returnTo: string;
  registered?: boolean;
}) {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <div className="mt-9">
      {registered ? (
        <p role="status" className="mb-6 border-l-2 border-accent bg-[#faf6ef] px-4 py-3 text-sm leading-6 text-primary">
          {copy.registered}
        </p>
      ) : null}
      <form className="space-y-6" noValidate onSubmit={signIn}>
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="block space-y-2 text-sm font-semibold text-primary">
          <span>{copy.usernameLabel}</span>
          <input
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            className="min-h-13 w-full border-b border-primary/30 bg-transparent py-3 text-base font-normal lowercase outline-none transition focus:border-accent"
            placeholder={copy.usernamePlaceholder}
          />
        </label>
        <label className="block space-y-2 text-sm font-semibold text-primary">
          <span>{copy.passwordLabel}</span>
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-13 w-full border-b border-primary/30 bg-transparent py-3 text-base font-normal outline-none transition focus:border-accent"
            placeholder={copy.passwordPlaceholder}
          />
        </label>
        <label className="flex items-center gap-3 text-sm text-subtext">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />
          <span>{copy.showPassword}</span>
        </label>
        <button className="consult-cta consult-cta--accent w-full justify-center" disabled={working}>
          <span className="consult-cta__label">{copy.continue}</span>
        </button>
      </form>
      {message ? (
        <p role="alert" className="mt-6 border-l-2 border-accent bg-[#faf6ef] px-4 py-3 text-sm leading-6 text-primary">
          {message}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link className="font-semibold text-accent underline underline-offset-4" href={`/${locale}/recover-username`}>
          {copy.recoverUsername}
        </Link>
        <Link className="font-semibold text-accent underline underline-offset-4" href={`/${locale}/reset-password`}>
          {copy.resetPassword}
        </Link>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-6 text-sm">
        <span className="text-subtext">{copy.newCustomer}</span>
        <Link className="font-semibold text-accent underline underline-offset-4" href={`/${locale}/register`}>
          {copy.createAccount}
        </Link>
      </div>
    </div>
  );

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const normalizedUsername = normalizeLoginName(username);
    if (!normalizedUsername) {
      setMessage(copy.errors.username);
      return;
    }
    if (!password) {
      setMessage(copy.errors.password);
      return;
    }
    setWorking(true);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({username: normalizedUsername, password, returnTo})
    }).catch(() => null);
    const payload = response
      ? await response.json().catch(() => ({})) as {authenticated?: boolean; redirectTo?: string; error?: keyof LoginCopy['errors']}
      : {};
    setPassword('');
    setWorking(false);
    if (!response?.ok || !payload.authenticated || !payload.redirectTo) {
      const errorKey = payload.error && payload.error in copy.errors ? payload.error : 'generic';
      setMessage(copy.errors[errorKey]);
      return;
    }
    window.location.assign(payload.redirectTo);
  }
}
