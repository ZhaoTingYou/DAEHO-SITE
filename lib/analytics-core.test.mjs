import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyAnalyticsLink,
  parseAnalyticsConsent,
  sanitizeAnalyticsEvent,
  sanitizeAnalyticsUrl,
  serializeAnalyticsConsent
} from './analytics-core.mjs';

test('analytics URLs retain attribution parameters and remove private configuration values', () => {
  const result = sanitizeAnalyticsUrl(
    'https://daeho.works/ko/golf/inquiry?utm_source=instagram&utm_medium=social&utm_campaign=always_on&utm_content=story&engraving=%EA%B9%80%EB%AF%BC%EC%88%98&head=gold&message=private'
  );

  assert.equal(
    result.pagePath,
    '/ko/golf/inquiry?utm_source=instagram&utm_medium=social&utm_campaign=always_on&utm_content=story'
  );
  assert.equal(result.pageLocation, `https://daeho.works${result.pagePath}`);
  assert.equal(result.pagePath.includes('engraving'), false);
  assert.equal(result.pagePath.includes('message'), false);
});

test('analytics URLs keep supported click identifiers and discard arbitrary query strings', () => {
  const result = sanitizeAnalyticsUrl('https://daeho.works/en?gclid=abc123&dclid=def456&preview=true');

  assert.equal(result.pagePath, '/en?gclid=abc123&dclid=def456');
});

test('analytics consent accepts only the current explicit cookie values', () => {
  assert.equal(parseAnalyticsConsent('session=x; daeho_analytics_consent=v1%3Agranted'), 'granted');
  assert.equal(parseAnalyticsConsent('daeho_analytics_consent=v1%3Adenied'), 'denied');
  assert.equal(parseAnalyticsConsent('daeho_analytics_consent=granted'), 'unknown');
  assert.equal(parseAnalyticsConsent(''), 'unknown');
});

test('analytics consent cookie is first-party, persistent, and secure on HTTPS', () => {
  assert.equal(
    serializeAnalyticsConsent('granted', true),
    'daeho_analytics_consent=v1%3Agranted; Path=/; Max-Age=15552000; SameSite=Lax; Secure'
  );
  assert.equal(
    serializeAnalyticsConsent('denied', false),
    'daeho_analytics_consent=v1%3Adenied; Path=/; Max-Age=15552000; SameSite=Lax'
  );
});

test('analytics events allow only defined non-personal parameters', () => {
  assert.deepEqual(
    sanitizeAnalyticsEvent('generate_lead', {
      form_type: 'golf',
      locale: 'ko',
      page_path: '/ko/golf/inquiry',
      name: 'Private Name',
      phone: '010-0000-0000',
      engraving: 'Private engraving'
    }),
    {
      name: 'generate_lead',
      parameters: {
        form_type: 'golf',
        locale: 'ko',
        page_path: '/ko/golf/inquiry'
      }
    }
  );
});

test('link classification identifies contact, golf, phone, email, and social clicks', () => {
  const origin = 'https://daeho.works';

  assert.deepEqual(classifyAnalyticsLink('/ko/contact', origin), {
    name: 'contact_cta_click',
    destination: '/ko/contact'
  });
  assert.deepEqual(classifyAnalyticsLink('/en/golf/inquiry', origin), {
    name: 'golf_inquiry_cta_click',
    destination: '/en/golf/inquiry'
  });
  assert.deepEqual(classifyAnalyticsLink('tel:+8212345678', origin), {
    name: 'phone_click',
    destination: 'tel'
  });
  assert.deepEqual(classifyAnalyticsLink('mailto:hello@daeho.works', origin), {
    name: 'email_click',
    destination: 'email'
  });
  assert.deepEqual(classifyAnalyticsLink('https://www.instagram.com/daeho', origin), {
    name: 'social_outbound_click',
    destination: 'instagram.com',
    platform: 'instagram'
  });
  assert.equal(classifyAnalyticsLink('/ko/archive', origin), null);
});
