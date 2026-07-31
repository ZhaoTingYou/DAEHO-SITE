import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const formSource = readFileSync(new URL('./contact-form.tsx', import.meta.url), 'utf8');
const validationSource = readFileSync(new URL('../../lib/cms/validation.ts', import.meta.url), 'utf8');
const springValidationSource = readFileSync(
  new URL('../../backend/cms/src/main/java/com/daeho/cms/service/RequestValidation.java', import.meta.url),
  'utf8'
);
const repositorySource = readFileSync(
  new URL('../../backend/cms/src/main/java/com/daeho/cms/repository/CmsRepository.java', import.meta.url),
  'utf8'
);
const migrationSource = readFileSync(
  new URL('../../backend/cms/src/main/resources/db/migration/V8__inquiry_notifications.sql', import.meta.url),
  'utf8'
);
const adminDetailSource = readFileSync(
  new URL('../../app/admin/(dashboard)/inquiries/[id]/page.tsx', import.meta.url),
  'utf8'
);
const koMessages = JSON.parse(readFileSync(new URL('../../messages/ko.json', import.meta.url), 'utf8'));
const enMessages = JSON.parse(readFileSync(new URL('../../messages/en.json', import.meta.url), 'utf8'));

test('Contact form renders and submits optional semantic email and phone fields', () => {
  assert.match(formSource, /email:\s*string;/);
  assert.match(
    formSource,
    /<TextField[\s\S]*?id="contact-email"[\s\S]*?name="email"[\s\S]*?type="email"[\s\S]*?inputMode="email"[\s\S]*?autoComplete="email"/
  );
  assert.ok(formSource.includes("phone: String(formData.get('phone') ?? '')"));
  assert.ok(formSource.includes("email: String(formData.get('email') ?? '')"));
  assert.equal(koMessages.forms.contact.email, '이메일');
  assert.equal(enMessages.forms.contact.email, 'Email');
});

test('Contact inquiry APIs accept either email or phone and validate a supplied email address', () => {
  assert.ok(validationSource.includes('requireEmailOrPhone'));
  assert.ok(validationSource.includes('Expected at least one email address or phone number.'));
  assert.ok(springValidationSource.includes('requireInquiryContact(payload, issues)'));
  assert.ok(springValidationSource.includes('validateEmail(payload.get("email"), "email", issues)'));
  assert.ok(springValidationSource.includes('maxLength(payload, "email", 254, issues)'));
});

test('Contact inquiry email and phone are stored, displayed in CMS, and remain compatible with old rows', () => {
  assert.match(migrationSource, /ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT ''/);
  assert.match(migrationSource, /SET phone = contact/);
  assert.ok(repositorySource.includes('Map.entry("email", validation.stringValue(payload.get("email")))'));
  assert.match(repositorySource, /name, contact, phone, email, organization/);
  assert.ok(repositorySource.includes('"phone", rs.getString("phone")'));
  assert.ok(repositorySource.includes('"email", rs.getString("email")'));
  assert.ok(adminDetailSource.includes("<DetailItem label={t('inquiry.email')} value={inquiry.email || '-'} />"));
});
