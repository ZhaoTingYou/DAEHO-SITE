import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const formSource = readFileSync(new URL('./collection-form.tsx', import.meta.url), 'utf8');
const actionsSource = readFileSync(new URL('../actions.ts', import.meta.url), 'utf8');
const validationSource = readFileSync(new URL('../../../lib/cms/validation.ts', import.meta.url), 'utf8');
const publicContentSource = readFileSync(new URL('../../../lib/cms/public-content.ts', import.meta.url), 'utf8');
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

const retiredFields = ['material', 'stones', 'madeFor', 'workInfo'];

test('collection CMS retains Finder metadata but removes retired localized detail specifications', () => {
  for (const field of retiredFields) {
    assert.equal(
      formSource.includes(`name={\`\${locale}.${field}\`}`),
      false,
      `Collection form should not expose retired ${field}`
    );
    assert.equal(
      actionsSource.includes(`${field}: stringFromForm(formData, \`\${locale}.${field}\`)`),
      false,
      `Collection action should not save retired ${field}`
    );
    assert.doesNotMatch(
      validationSource,
      new RegExp(`\\b${field}: optionalText`),
      `Collection validation should not retain ${field}`
    );
    assert.equal(
      publicContentSource.includes(`${field}: String(cmsItem.${field} || '')`),
      false,
      `Public collection mapping should not expose ${field}`
    );
  }

  for (const field of ['year', 'sportCategory', 'linkHref']) {
    assert.ok(formSource.includes(`name="specs.${field}"`), `Finder metadata should keep ${field}`);
    assert.ok(actionsSource.includes(`${field}: stringFromForm(formData, 'specs.${field}')`));
  }
});

test('collection detail and backend transport do not retain retired specification values', () => {
  assert.doesNotMatch(detailPageSource, /item\.(material|stones|madeFor|workInfo)/);

  for (const column of ['material', 'stones', 'made_for', 'work_info']) {
    assert.ok(migrationSource.includes(`ADD COLUMN IF NOT EXISTS ${column}`), 'applied migrations must remain immutable');
    assert.equal(repositorySource.includes(`rs.getString("${column}")`), false, `Repository should not return ${column}`);
    assert.equal(repositorySource.includes(`t.${column}`), false, `Public queries should not select ${column}`);
  }
});
