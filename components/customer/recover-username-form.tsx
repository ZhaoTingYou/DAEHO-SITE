'use client';

import Link from 'next/link';
import {useState, type FormEvent} from 'react';

import {normalizeKoreanPhoneForCognito} from '@/lib/customer/auth-ui-core.mjs';
import type {AccountMessages} from '@/lib/customer/messages';

type RecoveryCopy = AccountMessages['recoverUsername'];

export function RecoverUsernameForm({locale, copy}: {locale: 'ko' | 'en'; copy: RecoveryCopy}) {
  const [phone, setPhone] = useState('');
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [working, setWorking] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <div>
      {!sent ? (
        <form className="space-y-6" noValidate onSubmit={requestUsername}>
          <label className="block space-y-2 text-sm font-semibold uppercase tracking-[0.12em] text-subtext">
            <span>{copy.phoneLabel}</span>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setRequestKey(crypto.randomUUID());
              }}
              placeholder={copy.phonePlaceholder}
              className="min-h-12 w-full border-b border-primary/30 bg-transparent py-3 text-base font-normal normal-case tracking-normal text-primary outline-none focus:border-accent"
            />
          </label>
          <button className="consult-cta consult-cta--accent w-full justify-center" disabled={working}>
            <span className="consult-cta__label">{copy.submit}</span>
          </button>
        </form>
      ) : null}

      {message ? (
        <p
          role={sent ? 'status' : 'alert'}
          className={`mt-6 border-l-2 px-4 py-3 text-sm leading-6 ${sent ? 'border-accent bg-white/60' : 'border-primary bg-bg'}`}
        >
          {message}
        </p>
      ) : null}

      <Link className="mt-8 inline-block text-sm font-semibold text-accent underline underline-offset-4" href={`/${locale}/login`}>
        {copy.backToLogin}
      </Link>
    </div>
  );

  async function requestUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const normalizedPhone = normalizeKoreanPhoneForCognito(phone);
    if (!normalizedPhone) {
      setMessage(copy.errors.invalidPhone);
      return;
    }
    setWorking(true);
    const response = await fetch('/api/auth/recovery/username', {
      method: 'POST',
      headers: {'content-type': 'application/json', 'idempotency-key': requestKey},
      body: JSON.stringify({phone: normalizedPhone, locale})
    }).catch(() => null);
    setWorking(false);
    if (!response?.ok) {
      setMessage(response?.status === 429 ? copy.errors.rateLimit : copy.errors.generic);
      return;
    }
    setSent(true);
    setMessage(copy.sent);
  }
}
