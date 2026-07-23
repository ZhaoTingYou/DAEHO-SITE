import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

function readText(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

test('both fallback locales contain aligned disabled defaults', () => {
  const ko = readJson('../../messages/ko.json').common.footer.externalSites.items;
  const en = readJson('../../messages/en.json').common.footer.externalSites.items;
  assert.deepEqual(ko.map(({id}) => id), ['daeho', 'oh', 'vulcan']);
  assert.deepEqual(en.map(({id}) => id), ['daeho', 'oh', 'vulcan']);
  assert.ok([...ko, ...en].every((item) => item.href === '' && item.enabled === false));
});

test('common page save synchronizes the dedicated external-sites payload', () => {
  const actions = readText('./actions.ts');
  assert.match(actions, /formData\.has\('externalSites\.payload'\)/);
  assert.match(actions, /parseExternalSitesSubmission/);
  assert.match(actions, /pageContentGroupsKey/);
  assert.match(
    actions,
    /const externalSitesPath = `\$\{pageContentGroupsKey\}\.main\.footer\.externalSites\.items`/
  );
  assert.match(actions, /setObjectValueAtPath\(contentKo, externalSitesPath, externalSites\.ko\)/);
  assert.match(actions, /setObjectValueAtPath\(contentEn, externalSitesPath, externalSites\.en\)/);
});

test('footer CMS exposes one bilingual dynamic editor', () => {
  const editor = readText('./_components/external-sites-editor.tsx');
  const footerPage = readText('./(dashboard)/footer/page.tsx');
  assert.match(editor, /name="externalSites\.payload"/);
  assert.match(editor, /setItems/);
  assert.match(editor, /addItem/);
  assert.match(editor, /removeItem/);
  assert.match(editor, /moveItem/);
  assert.match(editor, /type="checkbox"/);
  assert.match(footerPage, /<ExternalSitesEditor/);
  assert.doesNotMatch(footerPage, /'footer\.externalSites\.daeho'/);
});

test('generic common-page catalog does not expose obsolete fixed external-site fields', () => {
  const catalog = readJson('../../lib/cms/page-catalog.json');
  const common = catalog.find(({pageKey}) => pageKey === 'common');
  const paths = common.fields.map(({path}) => path);

  assert.ok(!paths.includes('footer.externalSites.daeho'));
  assert.ok(!paths.includes('footer.externalSites.oh'));
  assert.ok(!paths.includes('footer.externalSites.vulcan'));
  assert.match(readText('./(dashboard)/footer/page.tsx'), /<ExternalSitesEditor/);
  assert.doesNotMatch(readText('./(dashboard)/pages/[pageKey]/page.tsx'), /ExternalSitesEditor/);
});

test('external-site validation alerts use the active admin locale translations', () => {
  const actions = readText('./actions.ts');
  const messages = readText('../../lib/admin-i18n.ts');

  assert.match(actions, /getExternalSiteValidationMessageKey/);
  assert.match(actions, /await getAdminI18n\(\)/);
  assert.match(actions, /t\(externalSiteErrorKey\)/);

  const translations = {
    zh: [
      '外部官网数据格式无效，请刷新页面后重试。',
      '外部官网数据必须为列表，请刷新页面后重试。',
      '外部官网记录缺少有效标识，请刷新页面后重试。',
      '外部官网记录标识重复，请刷新页面后重试。',
      '外部官网链接仅支持 http:// 或 https://。'
    ],
    en: [
      'The related-sites data is malformed. Refresh the page and try again.',
      'The related-sites data must be a list. Refresh the page and try again.',
      'A related-site entry is missing a valid ID. Refresh the page and try again.',
      'Related-site entry IDs must be unique. Refresh the page and try again.',
      'Related-site URLs must use http:// or https://.'
    ],
    ko: [
      '관련 사이트 데이터 형식이 올바르지 않습니다. 페이지를 새로고침한 후 다시 시도해 주세요.',
      '관련 사이트 데이터는 목록이어야 합니다. 페이지를 새로고침한 후 다시 시도해 주세요.',
      '관련 사이트 항목에 유효한 ID가 없습니다. 페이지를 새로고침한 후 다시 시도해 주세요.',
      '관련 사이트 항목 ID는 중복될 수 없습니다. 페이지를 새로고침한 후 다시 시도해 주세요.',
      '관련 사이트 URL은 http:// 또는 https://만 사용할 수 있습니다.'
    ]
  };

  for (const localizedMessages of Object.values(translations)) {
    for (const message of localizedMessages) {
      assert.match(messages, new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  }
});

test('public locale loading applies the external-site default merge boundary', () => {
  const localeMessages = readText('../../lib/locale-messages.ts');
  assert.match(localeMessages, /mergeExternalSitesWithDefaults/);
  assert.match(localeMessages, /footer\.externalSites/);
});
