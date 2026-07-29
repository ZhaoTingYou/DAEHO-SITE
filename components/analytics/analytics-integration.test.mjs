import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

function read(path) {
  const file = new URL(`../../${path}`, import.meta.url);
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

test('public site mounts a consent-gated analytics provider', () => {
  const layout = read('app/[locale]/(site)/layout.tsx');
  const provider = read('components/analytics/analytics-provider.tsx');
  const analytics = read('lib/analytics.ts');

  assert.match(layout, /<AnalyticsProvider locale=/);
  assert.match(provider, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(provider, /consent === 'granted'/);
  assert.match(analytics, /send_page_view:\s*false/);
  assert.match(analytics, /dataLayer\?\.push\(arguments\)/);
  assert.doesNotMatch(analytics, /dataLayer\?\.push\(args\)/);
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

test('Next build and image allowlist share the configurable public media base URL', () => {
  assert.match(read('Dockerfile.next'), /ARG NEXT_PUBLIC_MEDIA_BASE_URL/);
  assert.match(read('docker-compose.yml'), /NEXT_PUBLIC_MEDIA_BASE_URL/);
  assert.match(
    read('.env.example'),
    /NEXT_PUBLIC_MEDIA_BASE_URL=https:\/\/daeho-prod-media\.s3\.ap-northeast-2\.amazonaws\.com/
  );
  assert.match(read('next.config.ts'), /process\.env\.NEXT_PUBLIC_MEDIA_BASE_URL/);
});

test('internal analytics clears denied consent on hydration and mounts independently of GA readiness', () => {
  const provider = read('components/analytics/analytics-provider.tsx');

  assert.match(provider, /<InternalAnalyticsTracker enabled=/);
  assert.match(provider, /clearInternalAnalyticsSession/);
  assert.match(provider, /if \(storedConsent === 'denied'\) \{\s+clearInternalAnalyticsSession\(\);\s+\}/);
  assert.match(provider, /<AnalyticsPageView enabled=\{analyticsReady && consent === 'granted'\}/);
  assert.match(provider, /enabled=\{consent === 'granted'\}/);
  assert.match(
    provider,
    /consent === 'granted' && validMeasurementId \? \(\s*<InternalAnalyticsTracker enabled=\{consent === 'granted'\}/
  );
  assert.doesNotMatch(provider, /<InternalAnalyticsTracker enabled=\{[^}]*analyticsReady/);
});

test('internal analytics tracker sends one consented, anonymous route payload through the same-origin proxy', () => {
  const tracker = read('components/analytics/internal-analytics-tracker.tsx');
  const route = read('app/api/cms/analytics/page-view/route.ts');

  assert.match(tracker, /crypto\.randomUUID/);
  assert.match(tracker, /INTERNAL_ANALYTICS_SESSION_TIMEOUT_MS/);
  assert.match(tracker, /sanitizeInternalAnalyticsPath/);
  assert.doesNotMatch(tracker, /sanitizeAnalyticsUrl/);
  assert.match(tracker, /\/api\/cms\/analytics\/page-view/);
  assert.match(tracker, /lastPageKey/);
  assert.match(tracker, /keepalive:\s*true/);
  assert.match(tracker, /\.catch\(\(\) => undefined\)/);
  assert.match(route, /cmsBackendRequest/);
  assert.match(route, /error instanceof CmsBackendError/);
  assert.match(route, /Invalid JSON body/);
  assert.doesNotMatch(route, /user-agent|x-forwarded-for|ipAddress/i);
});
