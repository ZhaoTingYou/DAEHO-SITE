import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const source = read('./web-live-chat-widget.tsx');

test('launcher copy is permanently visible and no Telegram brand reaches customers', () => {
  assert.match(source, /copy\.label/);
  assert.match(source, /copy\.noSignIn/);
  assert.doesNotMatch(source, /telegram|paper plane/i);
  assert.doesNotMatch(source, /onPointerEnter.*width/s);
});

test('widget supports focus, escape, reduced motion, and mobile dialog semantics', () => {
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal/);
  assert.match(source, /Escape/);
  assert.match(source, /useReducedMotion/);
  assert.match(source, /100dvh/);
  assert.match(source, /safe-area-inset-bottom/);
});

test('dialog bypasses Lenis so desktop wheel events reach its nested scrollers', () => {
  const lenisProvider = read('../motion/lenis-provider.tsx');
  const dialog = source.match(/<motion\.section[\s\S]*?role="dialog"[\s\S]*?>/)?.[0] ?? '';

  assert.match(lenisProvider, /closest\('\[data-lenis-prevent\]'\)/);
  assert.match(dialog, /data-lenis-prevent/);
});

test('widget orchestrates the Task 8 client through every customer state', () => {
  assert.match(source, /createWebLiveChatState/);
  assert.match(source, /reduceWebLiveChatState/);
  assert.match(source, /getSession/);
  assert.match(source, /getMessages/);
  assert.match(source, /startConversation/);
  assert.match(source, /sendVisitorMessage/);
  assert.match(source, /connectEvents/);
  assert.match(source, /markRead/);
  assert.match(source, /state\.view === 'registration'/);
  assert.match(source, /state\.view === 'waiting'/);
  assert.match(source, /state\.view === 'active'/);
  assert.match(source, /state\.view === 'closed'/);
  assert.match(source, /state\.view === 'temporarily_unavailable'/);
});

test('logical writes retain one client key through explicit retry', () => {
  assert.match(source, /startMutationRef/);
  assert.match(source, /sendMutationRef/);
  assert.match(source, /createClientMessageKey/);
  assert.match(source, /sendStatus === 'failed'/);
  assert.match(source, /direction === 'visitor'/);
  assert.match(source, /dispatch\(\{type: 'send_succeeded'\}\)[\s\S]*refreshAuthoritative/);
});

test('owner visitor history renders as right-aligned bubbles without name or contact fields', () => {
  const history = source.match(/function MessageHistory[\s\S]*?\n\}/)?.[0] ?? '';
  assert.match(history, /message\.direction === 'visitor'/);
  assert.match(history, /ml-auto/);
  assert.doesNotMatch(history, /customerName|customerContact|nameLabel|contactLabel/);
});

test('message history uses compact WeChat-style participant bubbles and a centered system state', () => {
  const history = source.match(/function MessageHistory[\s\S]*?\n\}/)?.[0] ?? '';
  const visitor = history.match(/message\.direction === 'visitor'[\s\S]*?\) : message\.direction === 'team'/)?.[0] ?? '';
  const team = history.match(/message\.direction === 'team'[\s\S]*?\) : \(/)?.[0] ?? '';
  const system = history.match(/\) : \([\s\S]*?<\/li>/)?.[0] ?? '';

  assert.match(history, /space-y-2/);
  assert.match(visitor, /ml-auto/);
  assert.match(visitor, /w-fit/);
  assert.match(visitor, /max-w-\[78%\]/);
  assert.match(visitor, /rounded-tr-sm/);
  assert.match(visitor, /bg-\[#D9BF82\]/);
  assert.match(visitor, /\[overflow-wrap:anywhere\]/);
  assert.match(team, /mr-auto/);
  assert.match(team, /w-fit/);
  assert.match(team, /max-w-\[78%\]/);
  assert.match(team, /rounded-tl-sm/);
  assert.match(team, /bg-\[#101D30\]/);
  assert.match(team, /\[overflow-wrap:anywhere\]/);
  assert.match(system, /mx-auto/);
  assert.match(system, /text-center/);
  assert.doesNotMatch(system, /rounded-t[lr]-sm/);
});

test('stream source stays native-stable until polling threshold and broadcasts only invalidate', () => {
  assert.match(source, /createStableStreamController/);
  assert.doesNotMatch(source, /\[openCycle[^\]]*sseFailures/);
  const broadcastHandler = source.match(/channel\.onmessage[\s\S]*?\n    \};/)?.[0] ?? '';
  assert.match(broadcastHandler, /invalidation\.invalidate/);
  assert.doesNotMatch(broadcastHandler, /dispatch\(/);
});

test('site integration uses embedded copy and an enabled-only public config', () => {
  const layout = read('../../app/[locale]/(site)/layout.tsx');
  const actions = read('./site-floating-actions.tsx');
  const repositories = read('../../lib/cms/repositories.ts');
  const controller = read('../../backend/cms/src/main/java/com/daeho/cms/controller/TelegramLiveChatController.java');
  const ko = JSON.parse(read('../../messages/ko.json'));
  const en = JSON.parse(read('../../messages/en.json'));

  assert.match(layout, /getWebLiveChatPublicConfig/);
  assert.match(layout, /messages\.common\.webLiveChat/);
  assert.match(actions, /<WebLiveChatWidget/);
  assert.match(repositories, /cmsFetch<\{enabled: boolean\}>/);
  assert.doesNotMatch(repositories.match(/export async function getWebLiveChatPublicConfig[\s\S]*?\n\}/)?.[0] ?? '', /botUsername/);
  assert.match(controller, /codec\.configured\(\)/);
  assert.equal(ko.common.webLiveChat.label, '실시간 상담');
  assert.equal(ko.common.webLiveChat.noSignIn, '로그인 없이 바로 문의');
  assert.equal(en.common.webLiveChat.label, 'Live consultation');
  assert.equal(en.common.webLiveChat.noSignIn, 'No sign-in required');
  assert.equal(existsSync(new URL('./telegram-live-chat-button.tsx', import.meta.url)), false);
});

test('closed launcher refreshes authoritative unread state without marking it read', () => {
  assert.match(source, /CLOSED_REFRESH_MS/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /addEventListener\('focus'/);
  assert.match(source, /if \(!state\.panelOpen[\s\S]*markRead/);
  assert.match(source, /loadMessagePages/);
  assert.match(source, /session_metadata_loaded/);
  assert.match(source, /messages_merged/);
});

test('modal blocks pointer access and contains focus after interrupted-safe motion completion', () => {
  assert.match(source, /data-web-live-chat-backdrop/);
  assert.match(source, /\.inert = true/);
  assert.match(source, /focusin/);
  assert.match(source, /nextFocusIndex/);
  assert.match(source, /onLayoutAnimationComplete/);
  assert.doesNotMatch(source, /requestAnimationFrame\(\(\) => closeRef\.current\?\.focus/);
});

test('registration and send mutations are generation-guarded and classify definitive failures', () => {
  assert.match(source, /createLogicalMutationController/);
  assert.match(source, /WebLiveChatApiError/);
  assert.match(source, /definitive_failure/);
  assert.match(source, /ambiguous_failure/);
  assert.match(source, /<fieldset[\s\S]*disabled=/);
  assert.match(source, /status === 'accepted'/);
  assert.match(source, /copy\.hydrationError/);
});

test('in-progress delivery is retry-safe and never presented as sent', () => {
  const ko = JSON.parse(read('../../messages/ko.json'));
  const en = JSON.parse(read('../../messages/en.json'));

  assert.match(source, /response\.status === 'sent'/);
  assert.match(source, /finish\(operation, 'in_progress'\)/);
  assert.match(source, /send_in_progress/);
  assert.match(source, /copy\.inProgressLabel/);
  assert.notEqual(ko.common.webLiveChat.inProgressLabel, ko.common.webLiveChat.sentLabel);
  assert.notEqual(en.common.webLiveChat.inProgressLabel, en.common.webLiveChat.sentLabel);
});
