import assert from 'node:assert/strict';
import test from 'node:test';

let core = {};

try {
  core = await import('./kakao-contact-button-core.mjs');
} catch {
  // The first TDD run intentionally reaches this branch before the feature exists.
}

test('contact seal stays expanded through the threshold and collapses after it', () => {
  assert.equal(typeof core.shouldCollapseKakaoContact, 'function');
  assert.equal(core.shouldCollapseKakaoContact(0), false);
  assert.equal(core.shouldCollapseKakaoContact(160), false);
  assert.equal(core.shouldCollapseKakaoContact(161), true);
});

test('hover, focus, and an open notice expand a scrolled contact seal', () => {
  assert.equal(typeof core.createKakaoContactState, 'function');
  assert.equal(typeof core.reduceKakaoContactState, 'function');
  assert.equal(typeof core.isKakaoContactExpanded, 'function');

  const initial = core.createKakaoContactState();
  const scrolled = core.reduceKakaoContactState(initial, {type: 'scroll', collapsed: true});
  assert.equal(core.isKakaoContactExpanded(initial), true);
  assert.equal(core.isKakaoContactExpanded(scrolled), false);

  for (const event of [
    {type: 'hover', active: true},
    {type: 'focus', active: true},
    {type: 'toggle-notice'}
  ]) {
    const expanded = core.reduceKakaoContactState(scrolled, event);
    assert.equal(core.isKakaoContactExpanded(expanded), true);
  }
});

test('dismiss closes the notice without clearing scroll, hover, or focus state', () => {
  assert.equal(typeof core.createKakaoContactState, 'function');
  assert.equal(typeof core.reduceKakaoContactState, 'function');

  const initial = core.createKakaoContactState();
  const scrolled = core.reduceKakaoContactState(initial, {type: 'scroll', collapsed: true});
  const hovered = core.reduceKakaoContactState(scrolled, {type: 'hover', active: true});
  const focused = core.reduceKakaoContactState(hovered, {type: 'focus', active: true});
  const opened = core.reduceKakaoContactState(focused, {type: 'toggle-notice'});
  const dismissed = core.reduceKakaoContactState(opened, {type: 'dismiss'});

  assert.deepEqual(dismissed, {
    collapsed: true,
    hovered: true,
    focused: true,
    noticeOpen: false
  });
});
