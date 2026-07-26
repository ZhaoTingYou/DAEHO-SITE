import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const catalog = JSON.parse(
  readFileSync(new URL('../../lib/cms/page-catalog.json', import.meta.url), 'utf8')
);
const catalogSource = readFileSync(new URL('../../lib/cms/page-catalog.ts', import.meta.url), 'utf8');
const editorSource = readFileSync(
  new URL('./(dashboard)/pages/[pageKey]/page.tsx', import.meta.url),
  'utf8'
);
const fieldsSource = readFileSync(
  new URL('./_components/admin-fields.tsx', import.meta.url),
  'utf8'
);
const actionsSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8');

const expectedResponsiveFields = [
  ['home', 'main', 'image', 'mobileImage'],
  ['home', 'main', 'videoPoster', 'mobileVideoPoster'],
  ['home', 'homeUi', 'currentPulse.primaryImage', 'currentPulse.primaryMobileImage'],
  ['home', 'homeUi', 'currentPulse.secondaryImage', 'currentPulse.secondaryMobileImage'],
  ['archive', 'main', 'timeline.items.image', 'mobileImage'],
  ['heritage-loyalty', 'main', 'hero.image', 'hero.mobileImage'],
  ['heritage-loyalty', 'main', 'copy.featureSlides.backgroundImage', 'mobileImage'],
  ['heritage-credibility', 'main', 'hero.image', 'hero.mobileImage'],
  ['heritage-achievement', 'main', 'hero.image', 'hero.mobileImage'],
  ['mastery-technique', 'main', 'hero.image', 'hero.mobileImage'],
  ['mastery-technique', 'main', 'records.items.image', 'mobileImage'],
  ['mastery-making', 'main', 'hero.image', 'hero.mobileImage']
];

test('the page catalog declares every approved optional mobile image field', () => {
  for (const [pageKey, groupKey, path, mobilePath] of expectedResponsiveFields) {
    const page = catalog.find((entry) => entry.pageKey === pageKey);
    const directField = page?.fields.find((entry) => {
      const entryGroup = entry.groupKey ?? 'main';
      return entryGroup === groupKey && entry.path === path;
    });

    if (directField) {
      assert.equal(directField.mobilePath, mobilePath, `${pageKey}:${path}`);
      continue;
    }

    const field = page?.fields.find((entry) => {
      const entryGroup = entry.groupKey ?? 'main';
      return entryGroup === groupKey && entry.itemFields?.some((item) => `${entry.path}.${item.path}` === path);
    });
    const itemField = field?.itemFields?.find((entry) => `${field.path}.${entry.path}` === path);
    assert.equal(itemField?.mobilePath, mobilePath, `${pageKey}:${path}`);
  }
});

test('CMS page editors render paired responsive image cards and save optional mobile leaves', () => {
  assert.match(catalogSource, /mobilePath\?: string/);
  assert.match(catalogSource, /mobileImageLeaf/);
  assert.match(editorSource, /ResponsiveImageUploadField/);
  assert.match(editorSource, /mobilePath/);
  assert.match(actionsSource, /itemField\.mobilePath/);
});

test('responsive image cards can clear the mobile value and stay inside narrow CMS cards', () => {
  assert.match(fieldsSource, /export function ResponsiveImageUploadField/);
  assert.match(fieldsSource, /allowClear/);
  assert.match(fieldsSource, /clearLabel/);
  assert.match(fieldsSource, /filenameInputRef\.current\.value = ''/);
  assert.match(fieldsSource, /grid-cols-1[\s\S]*xl:grid-cols-2/);
  assert.match(fieldsSource, /min-w-0/);
  assert.match(fieldsSource, /max-w-full/);
});
