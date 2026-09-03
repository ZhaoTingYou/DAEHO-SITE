'use client';

import {
  inquiryPhonePattern,
  sanitizeInquiryPhoneInput
} from '@/lib/inquiry-phone-core.mjs';

export function InquiryPhoneField({
  id,
  label,
  hint,
  placeholder,
  readOnly = false
}: {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  readOnly?: boolean;
}) {
  const hintId = `${id}-hint`;

  return (
    <label htmlFor={id} className="block space-y-2 font-body text-[16px] font-semibold uppercase tracking-[0.08em] text-subtext md:text-sm md:tracking-[0.12em]">
      <span>{label}</span>
      <input
        id={id}
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        pattern={inquiryPhonePattern}
        minLength={11}
        maxLength={11}
        placeholder={placeholder}
        title={hint}
        aria-describedby={hintId}
        readOnly={readOnly}
        onInput={(event) => {
          event.currentTarget.value = sanitizeInquiryPhoneInput(event.currentTarget.value);
        }}
        className="min-h-[52px] w-full border-b border-primary/30 bg-transparent py-3 text-[16px] normal-case tracking-normal text-primary outline-none transition duration-hover ease-brand placeholder:text-subtext/55 focus:border-accent md:min-h-12 md:text-base"
      />
      <span id={hintId} className="block font-normal normal-case tracking-normal text-subtext">
        {hint}
      </span>
    </label>
  );
}
