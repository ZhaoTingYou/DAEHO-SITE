import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

function read(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

test('public site mounts a consent-gated analytics provider', () => {
  const layout = read('app/[locale]/(site)/layout.tsx');
  const provider = read('components/analytics/analytics-provider.tsx');
  const analytics = read('lib/analytics.ts');

  assert.match(layout, /<AnalyticsProvider locale=/);
  assert.match(provider, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(provider, /consent === 'granted'/);
  assert.match(analytics, /send_page_view:\s*false/);
  assert.match(provider, /sanitizeAnalyticsUrl/);
  assert.match(provider, /ANALYTICS_CONSENT_EVENT/);
});

test('footer exposes cookie settings and successful forms emit generate_lead', () => {
  const footer = read('components/site/site-footer.tsx');
  const contactForm = read('components/forms/contact-form.tsx');
  const golfForm = read('components/forms/golf-inquiry-form.tsx');

  assert.match(footer, /<CookieSettingsButton locale=/);
  assert.match(contactForm, /trackAnalyticsEvent\('generate_lead'/);
  assert.match(contactForm, /form_type:\s*'contact'/);
  assert.match(golfForm, /trackAnalyticsEvent\('generate_lead'/);
  assert.match(golfForm, /form_type:\s*'golf'/);
});

test('Docker build receives the public GA4 measurement ID', () => {
  assert.match(read('Dockerfile.next'), /ARG NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(read('docker-compose.yml'), /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(read('.env.example'), /NEXT_PUBLIC_GA_MEASUREMENT_ID=G-FXQGWE9XZ0/);
});
