import assert from 'node:assert/strict';
import test from 'node:test';

let core = {};

try {
  core = await import('./kakao-contact-button-core.mjs');
} catch {
  // The first TDD run intentionally reaches this branch before the feature exists.
}

test('idle contact seal collapses only above 160px', () => {
  assert.equal(typeof core.shouldCollapseKakaoContact, 'function');
  assert.equal(core.shouldCollapseKakaoContact(160, false), false);
  assert.equal(core.shouldCollapseKakaoContact(161, false), true);
});

test('a collapsed contact seal stays compact in the 120–160px hysteresis band', () => {
  assert.equal(core.shouldCollapseKakaoContact(121, true), true);
  assert.equal(core.shouldCollapseKakaoContact(160, true), true);
  assert.equal(core.shouldCollapseKakaoContact(120, true), false);
});

test('non-finite scroll positions preserve the current collapsed state', () => {
  for (const scrollY of [Number.NaN, Infinity, -Infinity]) {
    assert.equal(core.shouldCollapseKakaoContact(scrollY, false), false);
    assert.equal(core.shouldCollapseKakaoContact(scrollY, true), true);
  }
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

test('notice, focus, and hover keep priority over rapid scroll changes', () => {
  let state = core.createKakaoContactState();

  state = core.reduceKakaoContactState(state, {type: 'scroll', collapsed: true});
  assert.equal(core.isKakaoContactExpanded(state), false);

  for (const event of [
    {type: 'hover', active: true},
    {type: 'scroll', collapsed: false},
    {type: 'scroll', collapsed: true},
    {type: 'focus', active: true},
    {type: 'hover', active: false},
    {type: 'toggle-notice'},
    {type: 'focus', active: false}
  ]) {
    state = core.reduceKakaoContactState(state, event);
    assert.equal(core.isKakaoContactExpanded(state), true);
  }

  state = core.reduceKakaoContactState(state, {type: 'dismiss'});
  assert.equal(core.isKakaoContactExpanded(state), false);
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
