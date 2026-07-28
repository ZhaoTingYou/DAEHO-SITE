import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const formSource = readFileSync(new URL('./collection-form.tsx', import.meta.url), 'utf8');
const adminFieldsSource = readFileSync(new URL('./admin-fields.tsx', import.meta.url), 'utf8');
const actionsSource = readFileSync(new URL('../actions.ts', import.meta.url), 'utf8');
const validationSource = readFileSync(new URL('../../../lib/cms/validation.ts', import.meta.url), 'utf8');
const publicContentSource = readFileSync(new URL('../../../lib/cms/public-content.ts', import.meta.url), 'utf8');
const snapshotSource = readFileSync(new URL('../../../lib/cms/static-snapshot-core.ts', import.meta.url), 'utf8');
const adminListSource = readFileSync(
  new URL('../(dashboard)/collections/page.tsx', import.meta.url),
  'utf8'
);
const adminEditSource = readFileSync(
  new URL('../(dashboard)/collections/[id]/page.tsx', import.meta.url),
  'utf8'
);
const adminI18nSource = readFileSync(new URL('../../../lib/admin-i18n.ts', import.meta.url), 'utf8');
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
const collectionTranslationSource = actionsSource.slice(
  actionsSource.indexOf('function readCollectionTranslation('),
  actionsSource.indexOf('async function readGalleryImages(')
);

const retiredFields = ['material', 'stones', 'madeFor', 'workInfo'];

test('collection CMS keeps only canonical Finder metadata and removes retired detail specifications', () => {
  for (const field of retiredFields) {
    assert.equal(
      formSource.includes(`name={\`\${locale}.${field}\`}`),
      false,
      `Collection form should not expose retired ${field}`
    );
    assert.equal(
      collectionTranslationSource.includes(`${field}: stringFromForm(formData, \`\${locale}.${field}\`)`),
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

  assert.ok(formSource.includes('name="sportCategory"'), 'Finder should keep one canonical sport category');
  assert.ok(formSource.includes('name="specs.year"'), 'Finder should keep the year');
  assert.ok(actionsSource.includes("year: stringFromForm(formData, 'specs.year')"));

  for (const duplicateField of ['specs.sportCategory', 'specs.linkHref']) {
    assert.equal(formSource.includes(`name="${duplicateField}"`), false, `${duplicateField} should not be exposed`);
    assert.equal(actionsSource.includes(`stringFromForm(formData, '${duplicateField}')`), false, `${duplicateField} should not be saved`);
  }

  assert.doesNotMatch(
    publicContentSource,
    /specs\.(sportCategory|linkHref)/,
    'public Collection data should use the canonical sport category and automatic slug route'
  );
});

test('collection editor keeps only content that cannot be derived automatically', () => {
  for (const field of ['title', 'story', 'sportCategoryLabel']) {
    assert.ok(
      formSource.includes(`name={\`\${locale}.${field}\`}`),
      `Collection editor should keep ${field}`
    );
  }

  for (const field of ['caption', 'categoryLabel', 'seoTitle', 'seoDescription', 'ogImagePath']) {
    assert.equal(
      formSource.includes(`name={\`\${locale}.${field}\`}`),
      false,
      `Collection editor should not expose derived ${field}`
    );
    assert.equal(
      collectionTranslationSource.includes(`${field}: stringFromForm(formData, \`\${locale}.${field}\`)`),
      false,
      `Collection save should not accept derived ${field}`
    );
  }

  assert.doesNotMatch(
    formSource,
    /value: 'appointment'/,
    'the independent Appointment page must not be offered as a Collection category'
  );
  assert.match(
    validationSource,
    /category: z\.enum\(\['champion', 'bespoke'\]\)/,
    'Collection saves should accept only Collection-backed categories'
  );
});

test('legacy Appointment records stay isolated from Collection pages and cannot be silently reclassified', () => {
  assert.match(
    repositorySource,
    /WHERE c\.is_visible = true\s+AND c\.category IN \('champion', 'bespoke'\)/,
    'the public Collection list query should exclude independent Appointment records'
  );
  assert.match(
    repositorySource,
    /WHERE c\.slug = \? AND c\.is_visible = true\s+AND c\.category IN \('champion', 'bespoke'\)/,
    'the public Collection detail query should exclude independent Appointment records'
  );
  assert.match(
    snapshotSource,
    /isCollectionBackedCategory\(row\.category\)/,
    'static snapshots should exclude independent Appointment records'
  );
  assert.match(
    adminListSource,
    /\.filter\(\(item\) => isCollectionBackedCategory\(item\.category\)\)/,
    'the Collection admin list should not expose legacy Appointment records'
  );
  assert.match(
    adminEditSource,
    /!isCollectionBackedCategory\(item\.category\)/,
    'direct legacy Appointment edit URLs should be rejected instead of defaulting to Champion'
  );
});

test('removed fields retain read-only compatibility fallbacks while new saves use canonical fields', () => {
  assert.match(
    repositorySource,
    /COALESCE\(NULLIF\(t\.story, ''\), t\.caption\) AS resolved_story/,
    'legacy caption text should remain visible as the work story'
  );
  assert.match(
    repositorySource,
    /COALESCE\(NULLIF\(c\.sport_category, ''\), c\.specs_json ->> 'sportCategory'\) AS resolved_sport_category/,
    'legacy duplicate sport metadata should remain available through the canonical field'
  );
  assert.match(
    snapshotSource,
    /stringValue\(translation\.story\) \|\| stringValue\(translation\.caption\)/,
    'static snapshots should preserve legacy caption text as the work story'
  );
  assert.match(
    snapshotSource,
    /stringValue\(row\.sport_category\) \|\| stringValue\(sourceSpecs\.sportCategory\)/,
    'static snapshots should migrate legacy duplicate sport metadata in memory'
  );
});

test('Collection admin copy and search do not retain removed Appointment or derived translation fields', () => {
  assert.doesNotMatch(adminI18nSource, /collection\.categoryAppointment/);
  assert.doesNotMatch(adminI18nSource, /championship, appointment, and bespoke/);
  assert.doesNotMatch(adminI18nSource, /우승반지, 임관반지, 주문제작/);
  assert.doesNotMatch(adminListSource, /ko\.categoryLabel/);
  assert.doesNotMatch(adminListSource, /record\.(caption|categoryLabel)/);
});

test('collection metadata and content fields do not show ineffective typography controls', () => {
  for (const fieldName of ['slug', 'sportCategory', 'specs.year']) {
    assert.match(
      formSource,
      new RegExp(`<TextField[^>]*name="${fieldName.replace('.', '\\.')}"[^>]*editorControls=\\{false\\}`),
      `${fieldName} should render as a plain input`
    );
  }

  for (const localizedField of ['title', 'story', 'sportCategoryLabel']) {
    assert.match(
      formSource,
      new RegExp(`name=\\{\\\`\\$\\{locale\\}\\.${localizedField}\\\`\\}[^>]*editorControls=\\{false\\}`),
      `${localizedField} should not show font or alignment controls`
    );
  }

  assert.match(
    adminFieldsSource.slice(
      adminFieldsSource.indexOf('export function TextAreaField('),
      adminFieldsSource.indexOf('function TextEditorLabel(')
    ),
    /editorControls\?: boolean/,
    'text areas should support disabling typography controls'
  );
});

test('collection detail and backend transport do not retain retired specification values', () => {
  assert.doesNotMatch(detailPageSource, /item\.(material|stones|madeFor|workInfo)/);

  for (const column of ['material', 'stones', 'made_for', 'work_info']) {
    assert.ok(migrationSource.includes(`ADD COLUMN IF NOT EXISTS ${column}`), 'applied migrations must remain immutable');
    assert.equal(repositorySource.includes(`rs.getString("${column}")`), false, `Repository should not return ${column}`);
    assert.equal(repositorySource.includes(`t.${column}`), false, `Public queries should not select ${column}`);
  }
});
