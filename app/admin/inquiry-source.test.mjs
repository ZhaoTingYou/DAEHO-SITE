import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('inquiry filters expose the current website live-chat source without the legacy Telegram source', () => {
  const repositories = read('../../lib/cms/repositories.ts');
  const list = read('./(dashboard)/inquiries/page.tsx');
  const i18n = read('../../lib/admin-i18n.ts');

  assert.match(repositories, /'contact' \| 'golf' \| 'telegram' \| 'web_live_chat'/);
  assert.match(list, /source=web_live_chat/);
  assert.match(list, /source\.web_live_chat/);
  assert.doesNotMatch(list, /source=telegram/);
  assert.equal((i18n.match(/'source\.web_live_chat':/g) ?? []).length, 3);
});

test('inquiry filter actions can shrink and wrap within the page header at every viewport width', () => {
  const list = read('./(dashboard)/inquiries/page.tsx');

  assert.match(list, /className="[^"]*min-w-0[^"]*max-w-full[^"]*flex-wrap/);
});
