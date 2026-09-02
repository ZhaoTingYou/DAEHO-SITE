import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('website live-chat inquiries have a typed translated filter and never show a raw source key', () => {
  const repositories = read('../../lib/cms/repositories.ts');
  const list = read('./(dashboard)/inquiries/page.tsx');
  const i18n = read('../../lib/admin-i18n.ts');

  assert.match(repositories, /'contact' \| 'golf' \| 'telegram' \| 'web_live_chat'/);
  assert.match(list, /source=web_live_chat/);
  assert.match(list, /source\.web_live_chat/);
  assert.equal((i18n.match(/'source\.web_live_chat':/g) ?? []).length, 3);
});
