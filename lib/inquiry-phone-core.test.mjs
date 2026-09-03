import assert from 'node:assert/strict';
import test from 'node:test';

import {
  inquiryPhonePattern,
  isValidOptionalInquiryPhone,
  sanitizeInquiryPhoneInput,
  toDomesticInquiryPhone
} from './inquiry-phone-core.mjs';

test('문의 phone accepts only a blank value or 11 digits beginning with 010', () => {
  assert.equal(isValidOptionalInquiryPhone(''), true);
  assert.equal(isValidOptionalInquiryPhone('01012341234'), true);

  for (const invalid of [
    '010-1234-1234',
    '010 1234 1234',
    '+821012341234',
    '01112341234',
    '0101234123',
    '010123412345',
    '0101234abcd'
  ]) {
    assert.equal(isValidOptionalInquiryPhone(invalid), false, invalid);
  }
});

test('회원 E.164 phone is displayed and submitted as the required domestic format', () => {
  assert.equal(toDomesticInquiryPhone('+821012341234'), '01012341234');
  assert.equal(toDomesticInquiryPhone('01098765432'), '01098765432');
});

test('문의 phone input keeps at most 11 digits and exposes the browser pattern', () => {
  assert.equal(sanitizeInquiryPhoneInput('010-1234a-12345'), '01012341234');
  assert.equal(inquiryPhonePattern, '010[0-9]{8}');
});
