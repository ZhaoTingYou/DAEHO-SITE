import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const formSource = readFileSync(new URL('./collection-form.tsx', import.meta.url), 'utf8');
const actionsSource = readFileSync(new URL('../actions.ts', import.meta.url), 'utf8');
const validationSource = readFileSync(
  new URL('../../../lib/cms/validation.ts', import.meta.url),
  'utf8'
);
const publicContentSource = readFileSync(
  new URL('../../../lib/cms/public-content.ts', import.meta.url),
  'utf8'
);
const detailPageSource = readFileSync(
  new URL('../../../app/[locale]/(site)/mastery/creations/[slug]/page.tsx', import.meta.url),
  'utf8'
);
const repositorySource = readFileSync(
  new URL('../../../backend/cms/src/main/java/com/daeho/cms/repository/CmsRepository.java', import.meta.url),
  'utf8'
);
const migrationUrl = new URL(
  '../../../backend/cms/src/main/resources/db/migration/V6__collection_spec_translations.sql',
  import.meta.url
);
const migrationSource = existsSync(migrationUrl) ? readFileSync(migrationUrl, 'utf8') : '';

const localizedSpecFields = ['material', 'stones', 'madeFor', 'workInfo'];

test('collection CMS exposes and saves every localized specification shown on details', () => {
  for (const field of localizedSpecFields) {
    assert.ok(
      formSource.includes(`name={\`\${locale}.${field}\`}`),
      `Collection form should expose ${field} for each locale`
    );
    assert.ok(
      actionsSource.includes(`${field}: stringFromForm(formData, \`\${locale}.${field}\`)`),
      `Collection action should save ${field} for each locale`
    );
    assert.match(
      validationSource,
      new RegExp(`\\b${field}: optionalText`),
      `Collection validation should retain ${field}`
    );
  }
});

test('collection repository persists and returns localized specification fields', () => {
  for (const column of ['material', 'stones', 'made_for', 'work_info']) {
    assert.ok(
      migrationSource.includes(`ADD COLUMN IF NOT EXISTS ${column}`),
      `Migration should add ${column}`
    );
    assert.ok(
      repositorySource.includes(`rs.getString("${column}")`),
      `Repository should return ${column}`
    );
  }
});

test('collection detail uses CMS specification values instead of fixed placeholders', () => {
  for (const field of localizedSpecFields) {
    assert.ok(
      publicContentSource.includes(`${field}: String(cmsItem.${field} || '')`),
      `Public collection mapping should expose ${field}`
    );
  }

  assert.ok(detailPageSource.includes('item.material || text.placeholder'));
  assert.ok(detailPageSource.includes('item.stones || text.placeholder'));
  assert.ok(detailPageSource.includes('item.madeFor || text.placeholder'));
  assert.ok(detailPageSource.includes('item.workInfo || item.categoryLabel || text.placeholder'));
});
