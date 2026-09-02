'use client';

import Link from 'next/link';
import {useState, type FormEvent} from 'react';

import {
  normalizeLoginName,
  passwordPolicyIssues,
  registrationErrorCode,
  usernamePolicyIssues
} from '@/lib/customer/auth-ui-core.mjs';
import type {AccountMessages} from '@/lib/customer/messages';

type RegisterFormProps = {locale: 'ko' | 'en'; copy: AccountMessages['register']};

export function RegisterForm({locale, copy}: RegisterFormProps) {
  const [verificationId, setVerificationId] = useState('');
  const [grant, setGrant] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [smsRequestKey, setSmsRequestKey] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState<'idle' | 'working' | 'code' | 'verified' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  return (
    <div className="space-y-8">
      <form className="space-y-5" noValidate onSubmit={requestCode}>
        <CustomerField
          label={copy.fields.phone}
          name="phone"
          type="tel"
          value={phone}
          onChange={setPhone}
          placeholder="010-1234-5678"
          disabled={Boolean(verificationId)}
        />
        <CustomerField label={copy.fields.birthDate} name="birthDate" type="date" disabled={Boolean(verificationId)} />
        <label className="flex items-start gap-3 text-sm leading-6 text-primary">
          <input name="adultDeclaration" type="checkbox" required disabled={Boolean(verificationId)} className="mt-1" />
          <span>{copy.adultDeclaration}</span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-6 text-primary">
          <input name="requiredConsent" type="checkbox" required disabled={Boolean(verificationId)} className="mt-1" />
          <span>
            {copy.requiredConsent}{' '}
            <Link className="underline" href={`/${locale}/terms`}>{copy.terms}</Link>
            {' · '}
            <Link className="underline" href={`/${locale}/privacy`}>{copy.privacy}</Link>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-6 text-subtext">
          <input name="marketingConsent" type="checkbox" disabled={Boolean(verificationId)} className="mt-1" />
          <span>{copy.marketingConsent}</span>
        </label>
        {!verificationId ? (
          <button className="consult-cta consult-cta--accent" disabled={status === 'working'}>
            <span className="consult-cta__label">{copy.requestCode}</span>
          </button>
        ) : null}
      </form>

      {verificationId && !grant ? (
        <form className="space-y-5 border-t border-hairline pt-8" noValidate onSubmit={verifyCode}>
          <div className="border-l-2 border-accent bg-white/60 px-4 py-3 text-sm leading-6">
            {copy.codeSent}
          </div>
          <CustomerField label={copy.fields.code} name="code" inputMode="numeric" maxLength={6} />
          <button className="consult-cta consult-cta--accent" disabled={status === 'working'}>
            <span className="consult-cta__label">{copy.verifyPhone}</span>
          </button>
        </form>
      ) : null}

      {grant ? (
        <form className="space-y-5 border-t border-hairline pt-8" noValidate onSubmit={createAccount}>
          <p className="text-sm leading-6 text-primary">
            {copy.phoneVerified}
          </p>
          <CustomerField
            label={copy.fields.username}
            name="username"
            value={username}
            onChange={(value) => setUsername(value.toLowerCase())}
            autoComplete="username"
            aria-describedby="registration-username-policy"
          />
          <p id="registration-username-policy" className="text-xs leading-5 text-subtext">
            {copy.usernamePolicy} {copy.usernameImmutable}
          </p>
          <CustomerField
            label={copy.fields.password}
            name="password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            aria-describedby="registration-password-policy"
          />
          <ul id="registration-password-policy" className="grid gap-1 text-xs leading-5 text-subtext sm:grid-cols-2">
            {(['minLength', 'uppercase', 'lowercase', 'number', 'symbol'] as const).map((rule) => (
              <li key={rule} className={password && !passwordPolicyIssues(password).includes(rule) ? 'text-accent' : ''}>
                {password && !passwordPolicyIssues(password).includes(rule) ? '✓ ' : '· '}{copy.passwordRules[rule]}
              </li>
            ))}
          </ul>
          <CustomerField label={copy.fields.passwordConfirm} name="passwordConfirm" type="password" autoComplete="new-password" />
          <button className="consult-cta consult-cta--accent" disabled={status === 'working'}>
            <span className="consult-cta__label">{copy.createAccount}</span>
          </button>
        </form>
      ) : null}

      {message ? (
        <p role={status === 'error' ? 'alert' : 'status'} className={`border-l-2 px-4 py-3 text-sm leading-6 ${status === 'error' ? 'border-primary bg-bg' : 'border-accent bg-white/60'}`}>
          {message}
        </p>
      ) : null}
    </div>
  );

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus('working');
    setMessage('');
    const response = await fetch('/api/customer/verifications/sms/start', {
      method: 'POST',
      headers: {'content-type': 'application/json', 'idempotency-key': smsRequestKey},
      body: JSON.stringify({
        phone,
        birthDate: data.get('birthDate'),
        adultDeclaration: data.get('adultDeclaration') === 'on',
        requiredConsent: data.get('requiredConsent') === 'on',
        locale,
        marketingConsent: data.get('marketingConsent') === 'on'
      })
    });
    const payload = await response.json().catch(() => ({})) as {verificationId?: string; error?: string; message?: string};
    if (!response.ok || !payload.verificationId) {
      setStatus('error');
      setSmsRequestKey(crypto.randomUUID());
      setMessage(copy.errors.smsRequest);
      return;
    }
    setVerificationId(payload.verificationId);
    setStatus('code');
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus('working');
    setMessage('');
    const response = await fetch(`/api/customer/verifications/sms/${encodeURIComponent(verificationId)}/complete`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({code: data.get('code')})
    });
    const payload = await response.json().catch(() => ({})) as {grant?: string; error?: string; message?: string};
    if (!response.ok || !payload.grant) {
      setStatus('error');
      setMessage(copy.errors.code);
      return;
    }
    setGrant(payload.grant);
    setStatus('verified');
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const normalizedUsername = normalizeLoginName(username);
    if (!normalizedUsername || usernamePolicyIssues(username).length > 0) {
      setStatus('error');
      setMessage(copy.usernamePolicy);
      return;
    }
    const issues = passwordPolicyIssues(password);
    if (issues.length > 0) {
      setStatus('error');
      setMessage(issues.map((issue) => copy.passwordRules[issue]).join(' '));
      return;
    }
    if (password !== data.get('passwordConfirm')) {
      setStatus('error');
      setMessage(copy.errors.passwordMismatch);
      return;
    }
    setStatus('working');
    const prepareResponse = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({registrationGrant: grant})
    });
    const prepared = await prepareResponse.json().catch(() => ({})) as {
      cognitoEndpoint?: string;
      clientId?: string;
      error?: string;
      message?: string;
    };
    if (!prepareResponse.ok || !prepared.cognitoEndpoint || !prepared.clientId) {
      setStatus('error');
      setMessage(copy.errors.prepare);
      return;
    }
    const normalizedPhone = normalizePhone(phone);
    const signupResponse = await fetch(prepared.cognitoEndpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-amz-json-1.1',
        'x-amz-target': 'AWSCognitoIdentityProviderService.SignUp'
      },
      body: JSON.stringify({
        ClientId: prepared.clientId,
        Username: normalizedUsername,
        Password: password,
        UserAttributes: [{Name: 'phone_number', Value: normalizedPhone}],
        ClientMetadata: {registrationGrant: grant}
      })
    }).catch(() => null);
    if (!signupResponse) {
      setStatus('error');
      setMessage(copy.errors.cognitoConnection);
      return;
    }
    const signup = await signupResponse.json().catch(() => ({})) as {message?: string; __type?: string};
    if (!signupResponse.ok) {
      setStatus('error');
      const errorKey = registrationErrorCode({type: signup.__type, message: signup.message}) as keyof typeof copy.errors;
      setMessage(copy.errors[errorKey]);
      return;
    }
    setStatus('done');
    const loginUrl = new URL(`/${locale}/login`, window.location.origin);
    loginUrl.searchParams.set('registered', 'true');
    loginUrl.searchParams.set('username', normalizedUsername);
    window.location.assign(loginUrl.toString());
  }
}

function normalizePhone(input: string) {
  const value = input.replace(/[^0-9+]/g, '');
  return value.startsWith('010') ? `+82${value.slice(1)}` : value;
}

function CustomerField({label, name, value, onChange, ...props}: {
  label: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'onChange'>) {
  return (
    <label className="block space-y-2 text-sm font-semibold uppercase tracking-[0.12em] text-subtext">
      <span>{label}</span>
      <input
        {...props}
        name={name}
        required
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="min-h-12 w-full border-b border-primary/30 bg-transparent py-3 text-base font-normal normal-case tracking-normal text-primary outline-none focus:border-accent disabled:opacity-60"
      />
    </label>
  );
}
