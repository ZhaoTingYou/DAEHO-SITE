'use client';

import Link from 'next/link';
import {useState, type FormEvent, type InputHTMLAttributes} from 'react';

import {
  normalizeKoreanPhoneForCognito,
  normalizeLoginName,
  passwordPolicyIssues
} from '@/lib/customer/auth-ui-core.mjs';
import type {AccountMessages} from '@/lib/customer/messages';

type ResetCopy = AccountMessages['resetPassword'];
type Stage = 'request' | 'code' | 'password' | 'done';

export function ResetPasswordForm({locale, copy}: {locale: 'ko' | 'en'; copy: ResetCopy}) {
  const [stage, setStage] = useState<Stage>('request');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [recoveryGrant, setRecoveryGrant] = useState('');
  const [password, setPassword] = useState('');
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [verificationOperationKey, setVerificationOperationKey] = useState(() => crypto.randomUUID());
  const [resetOperationKey, setResetOperationKey] = useState(() => crypto.randomUUID());
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);

  return (
    <div className="space-y-8">
      {stage === 'request' ? (
        <form className="space-y-6" noValidate onSubmit={requestCode}>
          <RecoveryField
            label={copy.fields.username}
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value.toLowerCase());
              setRequestKey(crypto.randomUUID());
            }}
          />
          <RecoveryField
            label={copy.fields.phone}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              setRequestKey(crypto.randomUUID());
            }}
            placeholder="010-1234-5678"
          />
          <SubmitButton working={working} label={copy.requestCode} />
        </form>
      ) : null}

      {stage === 'code' ? (
        <form className="space-y-6" noValidate onSubmit={verifyCode}>
          <p className="border-l-2 border-accent bg-white/60 px-4 py-3 text-sm leading-6">{copy.codeSent}</p>
          <RecoveryField
            label={copy.fields.code}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
          />
          <SubmitButton working={working} label={copy.verifyCode} />
        </form>
      ) : null}

      {stage === 'password' ? (
        <form className="space-y-6" noValidate onSubmit={resetPassword}>
          <p className="border-l-2 border-accent bg-white/60 px-4 py-3 text-sm leading-6">{copy.phoneVerified}</p>
          <RecoveryField
            label={copy.fields.password}
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-describedby="recovery-password-policy"
          />
          <ul id="recovery-password-policy" className="grid gap-1 text-xs leading-5 text-subtext sm:grid-cols-2">
            {(['minLength', 'uppercase', 'lowercase', 'number', 'symbol'] as const).map((rule) => {
              const met = Boolean(password) && !passwordPolicyIssues(password).includes(rule);
              return <li key={rule} className={met ? 'text-accent' : ''}>{met ? '✓ ' : '· '}{copy.passwordRules[rule]}</li>;
            })}
          </ul>
          <RecoveryField
            label={copy.fields.passwordConfirm}
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
          />
          <SubmitButton working={working} label={copy.resetPassword} />
        </form>
      ) : null}

      {message ? (
        <p
          role={messageIsError ? 'alert' : 'status'}
          className={`border-l-2 px-4 py-3 text-sm leading-6 ${messageIsError ? 'border-primary bg-bg' : 'border-accent bg-white/60'}`}
        >
          {message}
        </p>
      ) : null}

      <Link className="inline-block text-sm font-semibold text-accent underline underline-offset-4" href={`/${locale}/login`}>
        {copy.backToLogin}
      </Link>
    </div>
  );

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessage();
    const normalizedUsername = normalizeLoginName(username);
    const normalizedPhone = normalizeKoreanPhoneForCognito(phone);
    if (!normalizedUsername) return showError(copy.errors.invalidUsername);
    if (!normalizedPhone) return showError(copy.errors.invalidPhone);

    setWorking(true);
    const response = await fetch('/api/auth/recovery/password/start', {
      method: 'POST',
      headers: {'content-type': 'application/json', 'idempotency-key': requestKey},
      body: JSON.stringify({loginName: normalizedUsername, phone: normalizedPhone, locale})
    }).catch(() => null);
    const payload = response
      ? await response.json().catch(() => ({})) as {verificationId?: string}
      : {};
    setWorking(false);
    if (!response?.ok || !payload.verificationId) {
      return showError(response?.status === 429 ? copy.errors.rateLimit : copy.errors.request);
    }
    setUsername(normalizedUsername);
    setPhone(normalizedPhone);
    setVerificationId(payload.verificationId);
    setVerificationOperationKey(crypto.randomUUID());
    setStage('code');
    showStatus(copy.codeSent);
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessage();
    const code = String(new FormData(event.currentTarget).get('code') ?? '').trim();
    if (!/^\d{6}$/.test(code)) return showError(copy.errors.code);
    setWorking(true);
    const response = await fetch(`/api/auth/recovery/password/${encodeURIComponent(verificationId)}/complete`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': verificationOperationKey
      },
      body: JSON.stringify({code})
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as {grant?: string} : {};
    setWorking(false);
    if (!response?.ok || !payload.grant) return showError(response?.status === 429 ? copy.errors.rateLimit : copy.errors.code);
    setRecoveryGrant(payload.grant);
    setStage('password');
    showStatus(copy.phoneVerified);
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    clearMessage();
    const confirmation = String(new FormData(event.currentTarget).get('passwordConfirm') ?? '');
    if (passwordPolicyIssues(password).length > 0) return showError(copy.errors.invalidPassword);
    if (password !== confirmation) return showError(copy.errors.passwordMismatch);
    setWorking(true);
    const response = await fetch('/api/auth/recovery/password/reset', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        recoveryGrant,
        loginName: username,
        operationKey: resetOperationKey,
        password
      })
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as {reset?: boolean} : {};
    setWorking(false);
    if (!response?.ok || !payload.reset) {
      if (response?.status === 400) {
        setPassword('');
        form.reset();
        setRecoveryGrant('');
        setVerificationId('');
        setRequestKey(crypto.randomUUID());
        setVerificationOperationKey(crypto.randomUUID());
        setResetOperationKey(crypto.randomUUID());
        setStage('request');
      }
      return showError(response?.status === 429 ? copy.errors.rateLimit : copy.errors.reset);
    }
    setPassword('');
    form.reset();
    setRecoveryGrant('');
    setStage('done');
    showStatus(copy.success);
  }

  function clearMessage() {
    setMessage('');
    setMessageIsError(false);
  }

  function showError(value: string) {
    setMessageIsError(true);
    setMessage(value);
  }

  function showStatus(value: string) {
    setMessageIsError(false);
    setMessage(value);
  }
}

function SubmitButton({working, label}: {working: boolean; label: string}) {
  return (
    <button className="consult-cta consult-cta--accent w-full justify-center" disabled={working}>
      <span className="consult-cta__label">{label}</span>
    </button>
  );
}

function RecoveryField({label, ...props}: {label: string} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-2 text-sm font-semibold uppercase tracking-[0.12em] text-subtext">
      <span>{label}</span>
      <input
        {...props}
        required
        className="min-h-12 w-full border-b border-primary/30 bg-transparent py-3 text-base font-normal normal-case tracking-normal text-primary outline-none focus:border-accent"
      />
    </label>
  );
}
