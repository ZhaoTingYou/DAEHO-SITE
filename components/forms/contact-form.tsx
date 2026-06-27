'use client';

import {type FormEvent, useState} from 'react';

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
      className="space-y-6"
      onSubmit={async (event) => {
        if (await submitContactForm(event)) {
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
      <label className="block space-y-2 font-body text-sm font-semibold uppercase tracking-[0.12em] text-subtext">
        <span>{text.type}</span>
        <select
          name="type"
          defaultValue={defaultType}
          className="min-h-12 w-full border-b border-primary/30 bg-transparent py-3 text-base normal-case tracking-normal text-primary outline-none transition duration-hover ease-brand focus:border-accent"
        >
          {text.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 font-body text-sm font-semibold uppercase tracking-[0.12em] text-subtext">
        <span>{text.message}</span>
        <textarea
          name="message"
          rows={6}
          maxLength={3000}
          autoComplete="off"
          className="w-full resize-none border-b border-primary/30 bg-transparent py-3 text-base normal-case tracking-normal text-primary outline-none transition duration-hover ease-brand focus:border-accent"
        />
      </label>
      <button
        type="submit"
        disabled={status === 'submitting' || isSubmitted}
        aria-busy={status === 'submitting'}
        className="min-h-12 border border-accent bg-accent px-7 py-3 font-body text-sm font-semibold uppercase tracking-[0.14em] text-white transition duration-hover ease-brand hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        {text.submit}
      </button>
      {isSubmitted ? (
        <div className="border-l-2 border-accent bg-bg px-4 py-3 font-body text-sm leading-6 text-primary" role="status">
          <p>{text.success}</p>
          <p className="mt-2 text-subtext">{text.fallback}</p>
        </div>
      ) : null}
      {status === 'error' ? (
        <div className="border-l-2 border-primary bg-bg px-4 py-3 font-body text-sm leading-6 text-primary" role="alert">
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
    <label htmlFor={id} className="block space-y-2 font-body text-sm font-semibold uppercase tracking-[0.12em] text-subtext">
      <span>{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required={required}
        className="min-h-12 w-full border-b border-primary/30 bg-transparent py-3 text-base normal-case tracking-normal text-primary outline-none transition duration-hover ease-brand focus:border-accent"
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
