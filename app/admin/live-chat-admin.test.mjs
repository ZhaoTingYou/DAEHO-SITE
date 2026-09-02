import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const repositories = readFileSync(
  new URL('../../lib/cms/repositories.ts', import.meta.url),
  'utf8'
);
const editor = readFileSync(
  new URL('./_components/telegram-live-chat-editor.tsx', import.meta.url),
  'utf8'
);
const page = readFileSync(
  new URL('./(dashboard)/live-chat/page.tsx', import.meta.url),
  'utf8'
);
const i18n = readFileSync(
  new URL('../../lib/admin-i18n.ts', import.meta.url),
  'utf8'
);

test('admin live-chat repository exposes one source-aware privacy-safe session contract', () => {
  assert.match(repositories, /export type LiveChatAdminSession = \{/);
  assert.match(repositories, /source: 'website' \| 'telegram_legacy'/);
  assert.match(repositories, /state: 'opening' \| 'active' \| 'needs_attention' \| 'closed'/);
  assert.match(repositories, /unreadCount: number/);
  assert.match(repositories, /topicThreadId: number \| null/);
  assert.doesNotMatch(
    repositories.match(/export type LiveChatAdminSession = \{[\s\S]*?\n\};/)?.[0] ?? '',
    /tokenHash|visitorId|cookie|ipHash|webhookSecret|botToken/
  );
});

test('CMS copy identifies the Bot as internal routing and sends customers to the website', () => {
  assert.match(i18n, /internal team routing Bot/i);
  assert.match(i18n, /customers use the DAEHO website/i);
  assert.match(i18n, /팀 내부 라우팅 Bot/);
  assert.match(i18n, /고객은 DAEHO 웹사이트/);
  assert.match(page, /sourceWebsite: t\('liveChat\.source\.website'\)/);
  assert.match(page, /resetTopicCreationConfirm: t\('liveChat\.resetTopicCreationConfirm'\)/);
});

test('admin live-chat rows show text source badges, website states, unread count, and accessible targets', () => {
  assert.match(editor, /session\.source === 'website'/);
  assert.match(editor, /copy\.sourceWebsite/);
  assert.match(editor, /copy\.sourceTelegramLegacy/);
  assert.match(editor, /copy\.stateOpening/);
  assert.match(editor, /session\.unreadCount/);
  assert.match(editor, /copy\.unreadReplies/);
  assert.match(editor, /min-h-11/);
  assert.match(editor, /focus-visible:/);
});

test('website recovery is explicit, state-limited, and Topic reset has its own confirmation', () => {
  assert.match(editor, /session\.source === 'website'[\s\S]*registration_delivery_/);
  assert.match(editor, /session\.source === 'website'[\s\S]*topic_creation_/);
  assert.match(editor, /websiteTopicReset[\s\S]*copy\.resetTopicCreationConfirm/);
  assert.match(editor, /window\.confirm\(confirmation\)/);
  assert.doesNotMatch(editor, /useEffect\([\s\S]*reset-topic-creation/);
  assert.doesNotMatch(editor, /useEffect\([\s\S]*retry-delivery/);
});

test('every exact website recovery action has a capability-guarded Next proxy', () => {
  const routeUrls = [
    '../api/admin/live-chat/sessions/[sessionId]/retry-topic-close/route.ts',
    '../api/admin/live-chat/sessions/[sessionId]/messages/[messageId]/confirm-delivered/route.ts',
    '../api/admin/live-chat/sessions/[sessionId]/messages/[messageId]/retry-delivery/route.ts'
  ];
  for (const routeUrl of routeUrls) {
    const url = new URL(routeUrl, import.meta.url);
    assert.equal(existsSync(url), true, routeUrl);
    const route = readFileSync(url, 'utf8');
    assert.match(route, /requireAdminCapability\(request, 'notifications:manage'\)/);
    assert.match(route, /error instanceof CmsBackendError/);
  }
  assert.match(repositories, /retryWebLiveChatTopicClose/);
  assert.match(repositories, /confirmWebLiveChatVisitorMessage/);
  assert.match(repositories, /retryWebLiveChatVisitorMessage/);
});
