import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const component = read('./telegram-live-chat-button.tsx');
const floatingActions = read('./site-floating-actions.tsx');
const publicLayout = read('../../app/[locale]/(site)/layout.tsx');
const adminShell = read('../../app/admin/_components/admin-shell.tsx');
const adminEditor = read('../../app/admin/_components/telegram-live-chat-editor.tsx');
const repositories = read('../../lib/cms/repositories.ts');
const credentialService = read('../../backend/cms/src/main/java/com/daeho/cms/service/TelegramLiveChatCredentialService.java');
const globals = read('../../app/globals.css');
const koMessages = JSON.parse(read('../../messages/ko.json'));
const enMessages = JSON.parse(read('../../messages/en.json'));

test('public pages receive safe live-chat configuration while CMS exposes a dedicated page', () => {
  assert.match(publicLayout, /getTelegramLiveChatPublicConfig/);
  assert.match(publicLayout, /liveChatCopy=\{messages\.common\.telegramLiveChat\}/);
  assert.match(floatingActions, /<TelegramLiveChatButton/);
  assert.match(adminShell, /href: '\/admin\/live-chat'/);
  assert.match(repositories, /cacheTags: \['cms:all', 'cms-live-chat'\]/);
});

test('CMS keeps the required live topic fixed and localizes session data labels', () => {
  assert.match(credentialService, /LIVE_TOPIC_NAME = "실시간 상담"/);
  assert.doesNotMatch(adminEditor, /settings\.topicName|copy\.topicName/);
  assert.doesNotMatch(adminEditor, />\{session\.state\}</);
  assert.doesNotMatch(adminEditor, /<th[^>]*>CMS<\/th>/);
  assert.match(adminEditor, /stateLabels\[session\.state\]/);
  assert.match(adminEditor, /copy\.inquiry/);
  assert.match(adminEditor, /reset-topic-creation/);
  assert.match(adminEditor, /topicCloseRecovery/);
  assert.match(credentialService, /canReadAllGroupMessages/);
  assert.match(credentialService, /verifyForumAccess/);
});

test('configured live chat opens Telegram safely and unconfigured chat keeps an accessible notice', () => {
  assert.match(component, /href=\{chatUrl\}/);
  assert.match(component, /target="_blank"/);
  assert.match(component, /rel="noopener noreferrer"/);
  assert.match(component, /role="status"/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /event\.key === 'Escape'/);
  assert.doesNotMatch(component, /botToken|Bot Token|api\.telegram\.org/);
});

test('the floating rail retains safe-area behavior and the renamed animation', () => {
  assert.match(floatingActions, /env\(safe-area-inset-bottom\)/);
  assert.match(floatingActions, /gap-3/);
  assert.match(globals, /@keyframes live-chat-notice-in/);
  assert.doesNotMatch(globals, /kakao-contact-notice-in/);
});

test('Korean and English live inquiry copy describes Telegram instead of KakaoTalk', () => {
  assert.equal(koMessages.common.telegramLiveChat.label, 'Telegram 실시간 상담');
  assert.equal(koMessages.common.telegramLiveChat.descriptor, 'LIVE INQUIRY');
  assert.equal(enMessages.common.telegramLiveChat.label, 'Telegram Live Inquiry');
  assert.equal(enMessages.common.telegramLiveChat.openAriaLabel, 'Start a live inquiry on Telegram');
});
