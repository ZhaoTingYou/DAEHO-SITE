import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const phoneFieldSource = readFileSync(new URL('./inquiry-phone-field.tsx', import.meta.url), 'utf8');
const contactFormSource = readFileSync(new URL('./contact-form.tsx', import.meta.url), 'utf8');
const golfFormSource = readFileSync(new URL('./golf-inquiry-form.tsx', import.meta.url), 'utf8');
const koMessages = JSON.parse(readFileSync(new URL('../../messages/ko.json', import.meta.url), 'utf8'));
const enMessages = JSON.parse(readFileSync(new URL('../../messages/en.json', import.meta.url), 'utf8'));

test('both 문의 forms expose one strict 010 phone field with localized guidance', () => {
  assert.match(phoneFieldSource, /name="phone"/);
  assert.match(phoneFieldSource, /inputMode="numeric"/);
  assert.match(phoneFieldSource, /pattern=\{inquiryPhonePattern\}/);
  assert.match(phoneFieldSource, /minLength=\{11\}/);
  assert.match(phoneFieldSource, /maxLength=\{11\}/);
  assert.match(phoneFieldSource, /placeholder=\{placeholder\}/);
  assert.match(phoneFieldSource, /sanitizeInquiryPhoneInput/);

  for (const source of [contactFormSource, golfFormSource]) {
    assert.match(source, /<InquiryPhoneField/);
    assert.match(source, /phone: toDomesticInquiryPhone\(nextProfile\.phone\)/);
  }

  assert.equal(koMessages.forms.contact.phoneHint, '010으로 시작하는 숫자 11자리를 입력해 주세요. 예: 01012341234');
  assert.equal(enMessages.forms.contact.phoneHint, 'Enter 11 digits beginning with 010. Example: 01012341234');
  assert.equal(koMessages.forms.contact.phonePlaceholder, '01012341234');
  assert.equal(enMessages.forms.contact.phonePlaceholder, '01012341234');
  assert.equal(koMessages.forms.golfInquiry.phoneHint, koMessages.forms.contact.phoneHint);
  assert.equal(enMessages.forms.golfInquiry.phoneHint, enMessages.forms.contact.phoneHint);
  assert.equal(koMessages.forms.golfInquiry.phonePlaceholder, koMessages.forms.contact.phonePlaceholder);
  assert.equal(enMessages.forms.golfInquiry.phonePlaceholder, enMessages.forms.contact.phonePlaceholder);
});
