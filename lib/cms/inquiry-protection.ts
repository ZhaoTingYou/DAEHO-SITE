import {NextResponse} from 'next/server';

import {createInquiryProtectionGuard, getInquiryProtectionConfigFromEnv} from './inquiry-protection-core';

type Guard = ReturnType<typeof createInquiryProtectionGuard>;

type InquiryProtectionInput = Parameters<Guard['check']>[0];

const globalInquiryProtection = globalThis as typeof globalThis & {
  __deahoInquiryProtectionGuard?: Guard;
};

export function rejectUnsafeInquiry(input: InquiryProtectionInput) {
  const result = getInquiryProtectionGuard().check(input);

  if (result.allowed) {
    return null;
  }

  const headers = new Headers();

  if (result.body.retryAfterSeconds) {
    headers.set('retry-after', String(result.body.retryAfterSeconds));
  }

  return NextResponse.json(result.body, {
    status: result.status,
    headers
  });
}

function getInquiryProtectionGuard() {
  globalInquiryProtection.__deahoInquiryProtectionGuard ??= createInquiryProtectionGuard(getInquiryProtectionConfigFromEnv());
  return globalInquiryProtection.__deahoInquiryProtectionGuard;
}
