import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const statusControl = readFileSync(
  new URL('./_components/inquiry-status-control.tsx', import.meta.url),
  'utf8'
);
const timeline = readFileSync(
  new URL('./_components/notification-timeline.tsx', import.meta.url),
  'utf8'
);
const settings = readFileSync(
  new URL('./_components/notification-settings-editor.tsx', import.meta.url),
  'utf8'
);
const statusManager = readFileSync(
  new URL('./_components/inquiry-status-manager.tsx', import.meta.url),
  'utf8'
);

test('inquiry status changes preview recipients and content before confirmation', () => {
  assert.match(statusControl, /\/status-preview/);
  assert.match(statusControl, /maskedRecipient/);
  assert.match(statusControl, /renderedBody/);
  assert.match(statusControl, /role="dialog"/);
});

test('inquiry status changes update immediately, use expectedStatus, and roll back on failure', () => {
  assert.match(statusControl, /setStatus\(next\)[\s\S]*expectedStatus: previous/);
  assert.match(statusControl, /if \(!response\?\.ok\)[\s\S]*setStatus\(previous\)/);
  assert.match(statusControl, /daeho:inquiry-status/);
});

test('inquiry notification history exposes attempts, failures, and one-channel retry', () => {
  assert.match(timeline, /attempts: Attempt\[\]/);
  assert.match(timeline, /attemptCount/);
  assert.match(timeline, /lastError/);
  assert.match(timeline, /\/retry/);
});

test('notification settings keep Kakao approval and provider codes separate from channel activation', () => {
  assert.match(settings, /approvalStatus/);
  assert.match(settings, /providerTemplateCode/);
  assert.match(settings, /isActive/);
  assert.match(settings, /\/api\/admin\/notifications\/test/);
});

test('inquiry statuses are CMS-managed and immediately available to the workflow control', () => {
  assert.match(statusControl, /selectableStatuses/);
  assert.match(statusControl, /statuses\.filter/);
  assert.match(statusManager, /POST/);
  assert.match(statusManager, /PATCH/);
  assert.match(statusManager, /\/api\/admin\/inquiry-statuses/);
});
