import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTelegramLiveChatState,
  isTelegramLiveChatExpanded,
  reduceTelegramLiveChatState,
  shouldCollapseTelegramLiveChat,
  telegramLiveChatUrl
} from './telegram-live-chat-button-core.mjs';

test('Telegram live inquiry deep links carry the site locale without exposing credentials', () => {
  assert.equal(
    telegramLiveChatUrl('@DAEHO_LIVE_BOT', 'ko'),
    'https://t.me/DAEHO_LIVE_BOT?start=site_ko'
  );
  assert.equal(
    telegramLiveChatUrl('DAEHO_LIVE_BOT', 'en'),
    'https://t.me/DAEHO_LIVE_BOT?start=site_en'
  );
  assert.equal(telegramLiveChatUrl('https://evil.example/bot', 'ko'), '');
});

test('the live inquiry seal collapses after scrolling and expands for interaction', () => {
  assert.equal(shouldCollapseTelegramLiveChat(160), false);
  assert.equal(shouldCollapseTelegramLiveChat(161), true);
  const initial = createTelegramLiveChatState();
  const collapsed = reduceTelegramLiveChatState(initial, {type: 'scroll', collapsed: true});
  assert.equal(isTelegramLiveChatExpanded(collapsed), false);
  assert.equal(
    isTelegramLiveChatExpanded(reduceTelegramLiveChatState(collapsed, {type: 'focus', active: true})),
    true
  );
});
