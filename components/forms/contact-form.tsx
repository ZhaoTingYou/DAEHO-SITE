'use client';

import {type FormEvent, useState} from 'react';

import {currentAnalyticsPagePath, trackAnalyticsEvent} from '@/lib/analytics';
import {isLocale} from '@/lib/locales';

type ContactFormProps = {
  copy: ContactFormCopy;
  defaultType?: InquiryType;
};

type InquiryType = 'appointment' | 'championship' | 'bespoke' | 'other';

type ContactFormCopy = {
  name: string;
  organization: string;
  contact: string;
  type: string;
  message: string;
  submit: string;
  success: string;
  fallback: string;
  options: Array<{value: string; label: string}>;
};

export function ContactForm({copy: text, defaultType = 'appointment'}: ContactFormProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const isSubmitted = status === 'success';

  return (
    <form
      className="mobile-form space-y-5 pb-[calc(32px+env(safe-area-inset-bottom))] md:space-y-6 md:pb-0"
      onSubmit={async (event) => {
        if (await submitContactForm(event)) {
          trackAnalyticsEvent('generate_lead', {
            form_type: 'contact',
            locale: getCurrentLocale(),
            page_path: currentAnalyticsPagePath()
          });
          setStatus('success');
        }
      }}
    >
      <SpamTrapField />
      <TextField id="contact-name" label={text.name} name="name" autoComplete="name" maxLength={120} required />
      <TextField id="contact-organization" label={text.organization} name="organization" autoComplete="organization" maxLength={160} />
      <TextField
        id="contact-contact"
        label={text.contact}
        name="contact"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        maxLength={180}
        required
      />
      <label className="block space-y-2 font-body text-[16px] font-semibold uppercase tracking-[0.08em] text-subtext md:text-sm md:tracking-[0.12em]">
        <span>{text.type}</span>
        <select
          name="type"
          defaultValue={defaultType}
          className="min-h-[52px] w-full border-b border-primary/30 bg-transparent py-3 text-[16px] normal-case tracking-normal text-primary outline-none transition duration-hover ease-brand focus:border-accent md:min-h-12 md:text-base"
        >
          {text.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 font-body text-[16px] font-semibold uppercase tracking-[0.08em] text-subtext md:text-sm md:tracking-[0.12em]">
        <span>{text.message}</span>
        <textarea
          name="message"
          rows={6}
          maxLength={3000}
          autoComplete="off"
          className="min-h-[156px] w-full resize-none border-b border-primary/30 bg-transparent py-3 text-[16px] normal-case tracking-normal text-primary outline-none transition duration-hover ease-brand focus:border-accent md:min-h-0 md:text-base"
        />
      </label>
      <button
        type="submit"
        disabled={status === 'submitting' || isSubmitted}
        aria-busy={status === 'submitting'}
        className="min-h-[52px] w-full border border-accent bg-accent px-7 py-3 font-body text-[16px] font-semibold uppercase tracking-[0.1em] text-white transition duration-hover ease-brand hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent md:min-h-12 md:w-auto md:text-sm md:tracking-[0.14em]"
      >
        {text.submit}
      </button>
      {isSubmitted ? (
        <div className="border-l-2 border-accent bg-bg px-4 py-3 font-body text-[16px] leading-7 text-primary md:text-sm md:leading-6" role="status">
          <p>{text.success}</p>
          <p className="mt-2 text-subtext">{text.fallback}</p>
        </div>
      ) : null}
      {status === 'error' ? (
        <div className="border-l-2 border-primary bg-bg px-4 py-3 font-body text-[16px] leading-7 text-primary md:text-sm md:leading-6" role="alert">
          {text.fallback}
        </div>
      ) : null}
    </form>
  );

  async function submitContactForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setStatus('submitting');

    const response = await fetch('/api/inquiries/contact', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        name: String(formData.get('name') ?? ''),
        organization: String(formData.get('organization') ?? ''),
        contact: String(formData.get('contact') ?? ''),
        type: String(formData.get('type') ?? ''),
        message: String(formData.get('message') ?? ''),
        website: String(formData.get('website') ?? ''),
        locale: getCurrentLocale(),
        pagePath: `${window.location.pathname}${window.location.search}`
      })
    }).catch(() => null);

    if (!response?.ok) {
      setStatus('error');
      return false;
    }

    form.reset();
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
  maxLength,
  required = false
}: {
  id: string;
  label: string;
  name: string;
  type?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  maxLength?: number;
  required?: boolean;
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
        maxLength={maxLength}
        required={required}
        className="min-h-[52px] w-full border-b border-primary/30 bg-transparent py-3 text-[16px] normal-case tracking-normal text-primary outline-none transition duration-hover ease-brand focus:border-accent md:min-h-12 md:text-base"
      />
    </label>
  );
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
