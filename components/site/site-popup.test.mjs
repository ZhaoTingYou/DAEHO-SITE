import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./site-popup.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../../app/[locale]/(site)/layout.tsx', import.meta.url), 'utf8');

test('public locale layout mounts one popup with CMS config', () => {
  assert.ok(layout.includes("import {SitePopup}"));
  assert.ok(layout.includes('<SitePopup config={messages.sitePopup} labels={messages.sitePopup.labels} />'));
});

test('popup applies active collection and dismissal rules before opening', () => {
  assert.ok(source.includes('useSyncExternalStore'));
  assert.ok(source.includes('getServerSnapshot: () => false'));
  assert.ok(source.includes('getActiveSitePopupItems(config)'));
  assert.ok(source.includes('createSitePopupVersion(config)'));
  assert.ok(source.includes('isSitePopupDismissed'));
  assert.ok(source.includes('sessionStorage.getItem'));
  assert.ok(source.includes('localStorage.getItem'));
});

test('one dialog automatically rotates and supports direct announcement selection', () => {
  assert.ok(source.includes('window.setInterval(advanceNext, 5000)'));
  assert.ok(source.includes('selectPrevious'));
  assert.ok(source.includes('role="tablist"'));
  assert.ok(source.includes("dispatchCarousel({type: 'select', index, length: activeItems.length})"));
  assert.ok(source.includes('activeItems.map'));
});

test('autoplay respects reduced motion, can be paused, and refreshes at schedule boundaries', () => {
  assert.ok(source.includes('usePrefersReducedMotion'));
  assert.ok(source.includes('!autoRotate || prefersReducedMotion'));
  assert.ok(source.includes('aria-pressed={!autoRotate}'));
  assert.ok(source.includes('window.setTimeout'));
  assert.ok(source.includes('setNow(Date.now())'));
});

test('failed announcement images become named placeholders without an error loop', () => {
  assert.ok(source.includes('failedImages.includes'));
  assert.ok(source.includes("dispatchCarousel({type: 'image-failed'"));
  assert.ok(source.includes('popupImageName(activeItem.image)'));
  assert.doesNotMatch(source, /onError=\{activeItems\.length > 1/);
});

test('popup supports persistent dismissal and accessible closing', () => {
  assert.ok(source.includes('sessionStorage.setItem'));
  assert.ok(source.includes('localStorage.setItem'));
  assert.ok(source.includes('role="dialog"'));
  assert.ok(source.includes("event.key === 'Escape'"));
  assert.ok(source.includes('closeRef.current?.focus()'));
  assert.ok(source.includes("onError={() => dispatchCarousel({type: 'image-failed'"));
  assert.ok(source.includes('object-contain'));
});

test('popup leaves the surrounding page visible without a backdrop treatment', () => {
  assert.ok(source.includes('className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"'));
  assert.ok(source.includes('className="pointer-events-auto relative flex'));
  assert.doesNotMatch(source, /backdrop-blur/);
  assert.doesNotMatch(source, /bg-(?:bg|primary|black)\//);
  assert.doesNotMatch(source, /aria-modal="true"/);
  assert.doesNotMatch(source, /document\.(?:body|documentElement)\.style\.overflow/);
  assert.doesNotMatch(source, /event\.target === event\.currentTarget/);
});
