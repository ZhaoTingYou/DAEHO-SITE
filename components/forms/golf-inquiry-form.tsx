'use client';

import {type FormEvent, useEffect, useRef, useState} from 'react';

import {currentAnalyticsPagePath, trackAnalyticsEvent} from '@/lib/analytics';
import {InquiryPhoneField} from '@/components/forms/inquiry-phone-field';
import {isLocale} from '@/lib/locales';
import {toDomesticInquiryPhone} from '@/lib/inquiry-phone-core.mjs';
import type {CustomerProfile} from '@/lib/customer/types';

type GolfInquiryFormProps = {
  copy: GolfInquiryFormCopy;
  configuration?: {
    head: string;
    shaft: string;
    style: string;
    engraving: string;
  };
};

type GolfInquiryFormCopy = {
  name: string;
  contact: string;
  phoneHint: string;
  phonePlaceholder: string;
  email: string;
  quantity: string;
  due: string;
  team: string;
  use: string;
  message: string;
  submit: string;
  success: string;
  fallback: string;
};

export function GolfInquiryForm({copy: text, configuration}: GolfInquiryFormProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [accountRequired, setAccountRequired] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isSubmitted = status === 'success';
  const draftKey = 'daeho:inquiry-draft:golf';

  useEffect(() => {
    fetch('/api/auth/session')
      .then((response) => response.json())
      .then((session: {authenticated?: boolean; inquiryAccountRequired?: boolean; profile?: CustomerProfile}) => {
        setAccountRequired(Boolean(session.inquiryAccountRequired));
        setProfile(session.authenticated && session.profile ? session.profile : null);
        const draft = readDraft(draftKey);
        const values = draft ?? {};
        const nextProfile = session.authenticated ? session.profile : null;
        fillForm(formRef.current, {
          ...values,
          ...(nextProfile ? {
            name: nextProfile.legalName || nextProfile.displayName || values.name,
            phone: toDomesticInquiryPhone(nextProfile.phone),
            email: nextProfile.email || values.email,
            team: nextProfile.team || values.team
          } : {})
        });
        setDraftRestored(Boolean(draft));
      })
      .catch(() => undefined);
  }, []);

  return (
    <form
      ref={formRef}
      className="mobile-form grid gap-5 pb-[calc(32px+env(safe-area-inset-bottom))] md:gap-6 md:pb-0 md:grid-cols-2"
      onSubmit={async (event) => {
        if (await submitGolfInquiryForm(event)) {
          trackAnalyticsEvent('generate_lead', {
            form_type: 'golf',
            locale: getCurrentLocale(),
            page_path: currentAnalyticsPagePath()
          });
          setStatus('success');
        }
      }}
    >
      <SpamTrapField />
      {configuration ? (
        <>
          <input type="hidden" name="selectedHead" value={configuration.head} />
          <input type="hidden" name="selectedShaft" value={configuration.shaft} />
          <input type="hidden" name="selectedStyle" value={configuration.style} />
          <input type="hidden" name="engravingSample" value={configuration.engraving} />
        </>
      ) : null}
      <TextField id="golf-name" label={text.name} name="name" autoComplete="name" maxLength={120} required />
      <InquiryPhoneField
        id="golf-contact"
        label={text.contact}
        hint={text.phoneHint}
        placeholder={text.phonePlaceholder}
        readOnly={Boolean(profile?.phone)}
      />
      <TextField
        id="golf-email"
        label={text.email}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        maxLength={254}
      />
      <TextField id="golf-quantity" label={text.quantity} name="quantity" type="number" inputMode="numeric" min="1" />
      <TextField id="golf-due" label={text.due} name="due" type="date" />
      <TextField id="golf-team" label={text.team} name="team" autoComplete="organization" maxLength={160} />
      <TextField id="golf-use" label={text.use} name="use" maxLength={160} />
      <label className="block space-y-2 font-body text-[16px] font-semibold uppercase tracking-[0.08em] text-subtext md:col-span-2 md:text-sm md:tracking-[0.12em]">
        <span>{text.message}</span>
        <textarea
          name="message"
          rows={6}
          maxLength={3000}
          autoComplete="off"
          className="min-h-[156px] w-full resize-none border-b border-primary/30 bg-transparent py-3 text-[16px] normal-case tracking-normal text-primary outline-none transition duration-hover ease-brand focus:border-accent md:min-h-0 md:text-base"
        />
      </label>
      <div className="space-y-4 md:col-span-2">
        <button
          type="submit"
          disabled={status === 'submitting' || isSubmitted}
          aria-busy={status === 'submitting'}
          className="min-h-[52px] w-full border border-accent bg-accent px-7 py-3 font-body text-[16px] font-semibold uppercase tracking-[0.1em] text-white transition duration-hover ease-brand hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent md:min-h-12 md:w-auto md:text-sm md:tracking-[0.14em]"
        >
          {text.submit}
        </button>
        {draftRestored ? (
          <div className="border-l-2 border-accent bg-white px-4 py-3 font-body text-[16px] leading-7 text-primary md:text-sm md:leading-6" role="status">
            {getCurrentLocale() === 'ko' ? '로그인 전에 작성한 내용을 복원했습니다. 확인 후 제출해 주세요.' : 'Your pre-login draft was restored. Review it before submitting.'}
          </div>
        ) : null}
        {isSubmitted ? (
          <div className="border-l-2 border-accent bg-white px-4 py-3 font-body text-[16px] leading-7 text-primary md:text-sm md:leading-6" role="status">
            <p>{text.success}</p>
            <p className="mt-2 text-subtext">{text.fallback}</p>
          </div>
        ) : null}
        {status === 'error' ? (
          <div className="border-l-2 border-primary bg-white px-4 py-3 font-body text-[16px] leading-7 text-primary md:text-sm md:leading-6" role="alert">
            {text.fallback}
          </div>
        ) : null}
      </div>
    </form>
  );

  async function submitGolfInquiryForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setStatus('submitting');

    const payload = {
      name: String(formData.get('name') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      email: String(formData.get('email') ?? ''),
      quantity: String(formData.get('quantity') ?? ''),
      due: String(formData.get('due') ?? ''),
      team: String(formData.get('team') ?? ''),
      use: String(formData.get('use') ?? ''),
      message: String(formData.get('message') ?? ''),
      selectedHead: String(formData.get('selectedHead') ?? ''),
      selectedShaft: String(formData.get('selectedShaft') ?? ''),
      selectedStyle: String(formData.get('selectedStyle') ?? ''),
      engravingSample: String(formData.get('engravingSample') ?? ''),
      website: String(formData.get('website') ?? ''),
      locale: getCurrentLocale(),
      pagePath: `${window.location.pathname}${window.location.search}`
    };
    if (accountRequired && !profile) {
      sessionStorage.setItem(draftKey, JSON.stringify(payload));
      window.location.assign(`/api/auth/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return false;
    }

    const response = await fetch('/api/inquiries/golf', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (response?.status === 401) {
      sessionStorage.setItem(draftKey, JSON.stringify(payload));
      window.location.assign(`/api/auth/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return false;
    }
    if (!response?.ok) {
      setStatus('error');
      return false;
    }

    form.reset();
    sessionStorage.removeItem(draftKey);
    setDraftRestored(false);
    return true;
  }
}

function TextField({
  id,
  label,
  name,
  type = 'text',
  inputMode,
  autoComplete,
  min,
  maxLength,
  required = false,
  readOnly = false
}: {
  id: string;
  label: string;
  name: string;
  type?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  min?: string;
  maxLength?: number;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label htmlFor={id} className="block space-y-2 font-body text-[16px] font-semibold uppercase tracking-[0.08em] text-subtext md:text-sm md:tracking-[0.12em]">
      <span>{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        min={min}
        maxLength={maxLength}
        required={required}
        readOnly={readOnly}
        className="min-h-[52px] w-full border-b border-primary/30 bg-transparent py-3 text-[16px] normal-case tracking-normal text-primary outline-none transition duration-hover ease-brand focus:border-accent md:min-h-12 md:text-base"
      />
    </label>
  );
}

function readDraft(key: string) {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) as Record<string, string> : null;
  } catch {
    return null;
  }
}

function fillForm(form: HTMLFormElement | null, values: Record<string, unknown>) {
  if (!form) return;
  for (const [name, value] of Object.entries(values)) {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
      field.value = String(value ?? '');
    }
  }
}

function SpamTrapField() {
  return (
    <input
      type="text"
      name="website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden opacity-0"
    />
  );
}

function getCurrentLocale() {
  const locale = window.location.pathname.split('/').filter(Boolean)[0];
  return isLocale(locale) ? locale : 'ko';
}
