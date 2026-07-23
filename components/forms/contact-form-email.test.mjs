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
  new URL('../../backend/cms/src/main/resources/db/migration/V4__contact_inquiry_email.sql', import.meta.url),
  'utf8'
);
const adminDetailSource = readFileSync(
  new URL('../../app/admin/(dashboard)/inquiries/[id]/page.tsx', import.meta.url),
  'utf8'
);
const koMessages = JSON.parse(readFileSync(new URL('../../messages/ko.json', import.meta.url), 'utf8'));
const enMessages = JSON.parse(readFileSync(new URL('../../messages/en.json', import.meta.url), 'utf8'));

test('Contact form renders and submits a required semantic email field', () => {
  assert.match(formSource, /email:\s*string;/);
  assert.match(
    formSource,
    /<TextField[\s\S]*?id="contact-email"[\s\S]*?name="email"[\s\S]*?type="email"[\s\S]*?inputMode="email"[\s\S]*?autoComplete="email"[\s\S]*?required/
  );
  assert.ok(formSource.includes("email: String(formData.get('email') ?? '')"));
  assert.equal(koMessages.forms.contact.email, '이메일');
  assert.equal(enMessages.forms.contact.email, 'Email');
});

test('Contact inquiry APIs require and validate the submitted email address', () => {
  assert.match(validationSource, /email:\s*z\.string\(\)\.trim\(\)\.email\(\)\.max\(254\)/);
  assert.ok(springValidationSource.includes('requireText(payload, "email", issues)'));
  assert.ok(springValidationSource.includes('validateEmail(payload.get("email"), "email", issues)'));
  assert.ok(springValidationSource.includes('maxLength(payload, "email", 254, issues)'));
});

test('Contact inquiry email is stored, displayed in CMS, and remains compatible with old rows', () => {
  assert.match(migrationSource, /ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT ''/);
  assert.ok(repositorySource.includes('Map.entry("email", validation.stringValue(payload.get("email")))'));
  assert.match(repositorySource, /name, contact, email, organization/);
  assert.ok(repositorySource.includes('"email", rs.getString("email")'));
  assert.ok(adminDetailSource.includes("<DetailItem label={t('inquiry.email')} value={inquiry.email || '-'} />"));
});
