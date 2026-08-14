import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const componentUrl = new URL('./contact-direct-phone-notice.tsx', import.meta.url);
const contactPageSource = readFileSync(
  new URL('../../app/[locale]/(site)/contact/page.tsx', import.meta.url),
  'utf8'
);

test('Contact direct-phone notice omits empty copy and accents only the phone', () => {
  assert.equal(existsSync(componentUrl), true, 'ContactDirectPhoneNotice component should exist');
  const componentSource = readFileSync(componentUrl, 'utf8');

  assert.match(componentSource, /const hasContent = Boolean\(copy\.before \|\| copy\.phone \|\| copy\.after\);/);
  assert.match(componentSource, /if \(!hasContent\) \{\s*return null;\s*\}/);
  assert.ok(componentSource.includes("{copy.before && copy.phone ? ' ' : null}"));
  assert.match(
    componentSource,
    /\{copy\.phone \? <span className="text-accent whitespace-nowrap">\{copy\.phone\}<\/span> : null\}/
  );
  assert.match(componentSource, /text-\[16px\][^"]*md:text-\[14px\]/);
});

test('Contact page places the direct-phone notice before the form', () => {
  assert.ok(
    contactPageSource.includes(
      "import {ContactDirectPhoneNotice} from '@/components/forms/contact-direct-phone-notice';"
    )
  );
  assert.ok(contactPageSource.includes('<ContactDirectPhoneNotice copy={text.directPhone} />'));
  assert.ok(
    contactPageSource.indexOf('<ContactDirectPhoneNotice copy={text.directPhone} />') <
      contactPageSource.indexOf('<ContactForm')
  );
  assert.match(contactPageSource, /space-y-5[^"]*md:space-y-6/);
});
