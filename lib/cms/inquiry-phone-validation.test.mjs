import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const validationSource = readFileSync(new URL('./validation.ts', import.meta.url), 'utf8');
const contactRouteSource = readFileSync(
  new URL('../../app/api/inquiries/contact/route.ts', import.meta.url),
  'utf8'
);
const golfRouteSource = readFileSync(
  new URL('../../app/api/inquiries/golf/route.ts', import.meta.url),
  'utf8'
);

test('public 문의 requests and authenticated profiles use the same domestic phone rule', () => {
  assert.match(validationSource, /isValidOptionalInquiryPhone/);
  assert.match(validationSource, /Expected an 11-digit mobile number beginning with 010\./);

  for (const source of [contactRouteSource, golfRouteSource]) {
    assert.match(source, /toDomesticInquiryPhone/);
    assert.match(source, /phone: toDomesticInquiryPhone\(profile\.phone\)/);
  }
});
