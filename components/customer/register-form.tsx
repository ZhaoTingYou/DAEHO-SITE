'use client';

import Link from 'next/link';
import {useState, type FormEvent} from 'react';

type RegisterFormProps = {locale: 'ko' | 'en'};

export function RegisterForm({locale}: RegisterFormProps) {
  const ko = locale === 'ko';
  const [verificationId, setVerificationId] = useState('');
  const [grant, setGrant] = useState('');
  const [phone, setPhone] = useState('');
  const [smsRequestKey, setSmsRequestKey] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState<'idle' | 'working' | 'code' | 'verified' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  return (
    <div className="space-y-8">
      <form className="space-y-5" onSubmit={requestCode}>
        <CustomerField
          label={ko ? '휴대폰 번호' : 'Mobile number'}
          name="phone"
          type="tel"
          value={phone}
          onChange={setPhone}
          placeholder="010-1234-5678"
          disabled={Boolean(verificationId)}
        />
        <CustomerField label={ko ? '생년월일' : 'Date of birth'} name="birthDate" type="date" disabled={Boolean(verificationId)} />
        <label className="flex items-start gap-3 text-sm leading-6 text-primary">
          <input name="adultDeclaration" type="checkbox" required disabled={Boolean(verificationId)} className="mt-1" />
          <span>{ko ? '만 19세 이상이며 입력한 정보가 사실임을 확인합니다.' : 'I confirm that I am at least 19 and the information is accurate.'}</span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-6 text-primary">
          <input name="requiredConsent" type="checkbox" required disabled={Boolean(verificationId)} className="mt-1" />
          <span>
            {ko ? '이용약관과 개인정보처리방침에 동의합니다.' : 'I agree to the Terms and Privacy Policy.'}{' '}
            <Link className="underline" href={`/${locale}/terms`}>{ko ? '약관' : 'Terms'}</Link>
            {' · '}
            <Link className="underline" href={`/${locale}/privacy`}>{ko ? '개인정보' : 'Privacy'}</Link>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-6 text-subtext">
          <input name="marketingConsent" type="checkbox" disabled={Boolean(verificationId)} className="mt-1" />
          <span>{ko ? '마케팅 정보 수신에 동의합니다. (선택)' : 'I agree to receive marketing messages. (Optional)'}</span>
        </label>
        {!verificationId ? (
          <button className="consult-cta consult-cta--accent" disabled={status === 'working'}>
            <span className="consult-cta__label">{ko ? '인증번호 요청' : 'Request code'}</span>
          </button>
        ) : null}
      </form>

      {verificationId && !grant ? (
        <form className="space-y-5 border-t border-hairline pt-8" onSubmit={verifyCode}>
          <div className="border-l-2 border-accent bg-white/60 px-4 py-3 text-sm leading-6">
            {ko
              ? 'SOLAPI를 통해 인증번호가 자동으로 전송되었습니다. 문자로 받은 6자리 번호를 입력해 주세요.'
              : 'The verification code was sent automatically through SOLAPI. Enter the 6-digit code from the SMS.'}
          </div>
          <CustomerField label={ko ? '6자리 인증번호' : '6-digit code'} name="code" inputMode="numeric" maxLength={6} />
          <button className="consult-cta consult-cta--accent" disabled={status === 'working'}>
            <span className="consult-cta__label">{ko ? '휴대폰 확인' : 'Verify phone'}</span>
          </button>
        </form>
      ) : null}

      {grant ? (
        <form className="space-y-5 border-t border-hairline pt-8" onSubmit={createAccount}>
          <p className="text-sm leading-6 text-primary">
            {ko ? '휴대폰이 확인되었습니다. 로그인에 사용할 비밀번호를 설정하세요.' : 'Phone verified. Set the password you will use to sign in.'}
          </p>
          <CustomerField label={ko ? '비밀번호' : 'Password'} name="password" type="password" minLength={8} autoComplete="new-password" />
          <CustomerField label={ko ? '비밀번호 확인' : 'Confirm password'} name="passwordConfirm" type="password" minLength={8} autoComplete="new-password" />
          <button className="consult-cta consult-cta--accent" disabled={status === 'working'}>
            <span className="consult-cta__label">{ko ? '계정 만들기' : 'Create account'}</span>
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
      setMessage(payload.message || payload.error || (ko ? '인증 요청을 처리할 수 없습니다.' : 'Unable to request verification.'));
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
      setMessage(payload.message || payload.error || (ko ? '인증번호가 올바르지 않거나 만료되었습니다.' : 'The code is invalid or expired.'));
      return;
    }
    setGrant(payload.grant);
    setStatus('verified');
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') ?? '');
    if (password !== data.get('passwordConfirm')) {
      setStatus('error');
      setMessage(ko ? '비밀번호가 일치하지 않습니다.' : 'Passwords do not match.');
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
      loginUrl?: string;
      error?: string;
      message?: string;
    };
    if (!prepareResponse.ok || !prepared.cognitoEndpoint || !prepared.clientId) {
      setStatus('error');
      setMessage(prepared.message || prepared.error || (ko ? '계정을 만들 수 없습니다.' : 'Unable to create account.'));
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
        Username: normalizedPhone,
        Password: password,
        UserAttributes: [{Name: 'phone_number', Value: normalizedPhone}],
        ClientMetadata: {registrationGrant: grant}
      })
    }).catch(() => null);
    if (!signupResponse) {
      setStatus('error');
      setMessage(ko ? 'Cognito에 연결할 수 없습니다.' : 'Unable to reach Cognito.');
      return;
    }
    const signup = await signupResponse.json().catch(() => ({})) as {message?: string; __type?: string};
    if (!signupResponse.ok) {
      setStatus('error');
      setMessage(signup.message || signup.__type?.split('#').at(-1) || (ko ? '계정을 만들 수 없습니다.' : 'Unable to create account.'));
      return;
    }
    setStatus('done');
    const loginUrl = new URL(prepared.loginUrl ?? '/api/auth/login', window.location.origin);
    loginUrl.searchParams.set('returnTo', `/${locale}/my-daeho`);
    loginUrl.searchParams.set('reauth', 'true');
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
