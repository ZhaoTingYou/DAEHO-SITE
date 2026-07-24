import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./site-popup.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../../app/[locale]/(site)/layout.tsx', import.meta.url), 'utf8');

test('public locale layout mounts one popup with CMS config', () => {
  assert.ok(layout.includes("import {SitePopup}"));
  assert.ok(layout.includes('<SitePopup config={messages.sitePopup} locale={locale as Locale} />'));
});

test('popup applies active and dismissal rules before opening', () => {
  assert.ok(source.includes('useSyncExternalStore'));
  assert.ok(source.includes('getServerSnapshot: () => false'));
  assert.ok(source.includes('isSitePopupActive(config)'));
  assert.ok(source.includes('createSitePopupVersion(config)'));
  assert.ok(source.includes('isSitePopupDismissed'));
  assert.ok(source.includes('sessionStorage.getItem'));
  assert.ok(source.includes('localStorage.getItem'));
});

test('popup supports persistent dismissal and accessible closing', () => {
  assert.ok(source.includes('sessionStorage.setItem'));
  assert.ok(source.includes('localStorage.setItem'));
  assert.ok(source.includes('role="dialog"'));
  assert.ok(source.includes('aria-modal="true"'));
  assert.ok(source.includes("event.key === 'Escape'"));
  assert.ok(source.includes("event.key !== 'Tab'"));
  assert.ok(source.includes("document.body.style.overflow = 'hidden'"));
  assert.ok(source.includes("document.documentElement.style.overflow = 'hidden'"));
  assert.ok(source.includes('onError={closeWithoutSaving}'));
  assert.ok(source.includes('object-contain'));
});
