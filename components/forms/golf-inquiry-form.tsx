'use client';

import {type FormEvent, useState} from 'react';

import {isLocale} from '@/lib/locales';

type GolfInquiryFormProps = {
  copy: GolfInquiryFormCopy;
  configuration?: {
    head: string;
    shaft: string;
    engraving: string;
  };
};

type GolfInquiryFormCopy = {
  name: string;
  contact: string;
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
  const isSubmitted = status === 'success';

  return (
    <form
      className="grid gap-6 md:grid-cols-2"
      onSubmit={async (event) => {
        if (await submitGolfInquiryForm(event)) {
          setStatus('success');
        }
      }}
    >
      {configuration ? (
        <>
          <input type="hidden" name="selectedHead" value={configuration.head} />
          <input type="hidden" name="selectedShaft" value={configuration.shaft} />
          <input type="hidden" name="engravingSample" value={configuration.engraving} />
        </>
      ) : null}
      <TextField id="golf-name" label={text.name} name="name" autoComplete="name" />
      <TextField id="golf-contact" label={text.contact} name="contact" type="tel" inputMode="tel" autoComplete="tel" />
      <TextField id="golf-quantity" label={text.quantity} name="quantity" type="number" inputMode="numeric" min="1" />
      <TextField id="golf-due" label={text.due} name="due" type="date" />
      <TextField id="golf-team" label={text.team} name="team" autoComplete="organization" />
      <TextField id="golf-use" label={text.use} name="use" />
      <label className="block space-y-2 font-body text-sm font-semibold uppercase tracking-[0.12em] text-subtext md:col-span-2">
        <span>{text.message}</span>
        <textarea
          name="message"
          rows={6}
          autoComplete="off"
          className="w-full resize-none border-b border-primary/30 bg-transparent py-3 text-base normal-case tracking-normal text-primary outline-none transition duration-hover ease-brand focus:border-accent"
        />
      </label>
      <div className="space-y-4 md:col-span-2">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="min-h-12 border border-accent bg-accent px-7 py-3 font-body text-sm font-semibold uppercase tracking-[0.14em] text-white transition duration-hover ease-brand hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {text.submit}
        </button>
        {isSubmitted ? (
          <div className="border-l-2 border-accent bg-white px-4 py-3 font-body text-sm leading-6 text-primary" role="status">
            <p>{text.success}</p>
            <p className="mt-2 text-subtext">{text.fallback}</p>
          </div>
        ) : null}
        {status === 'error' ? (
          <div className="border-l-2 border-primary bg-white px-4 py-3 font-body text-sm leading-6 text-primary" role="alert">
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

    const response = await fetch('/api/inquiries/golf', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        name: String(formData.get('name') ?? ''),
        contact: String(formData.get('contact') ?? ''),
        quantity: String(formData.get('quantity') ?? ''),
        due: String(formData.get('due') ?? ''),
        team: String(formData.get('team') ?? ''),
        use: String(formData.get('use') ?? ''),
        message: String(formData.get('message') ?? ''),
        selectedHead: String(formData.get('selectedHead') ?? ''),
        selectedShaft: String(formData.get('selectedShaft') ?? ''),
        engravingSample: String(formData.get('engravingSample') ?? ''),
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
  min
}: {
  id: string;
  label: string;
  name: string;
  type?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  min?: string;
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
        min={min}
        className="min-h-12 w-full border-b border-primary/30 bg-transparent py-3 text-base normal-case tracking-normal text-primary outline-none transition duration-hover ease-brand focus:border-accent"
      />
    </label>
  );
}

function getCurrentLocale() {
  const locale = window.location.pathname.split('/').filter(Boolean)[0];
  return isLocale(locale) ? locale : 'ko';
}
