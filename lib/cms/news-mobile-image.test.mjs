import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const migrationUrl = new URL(
  '../../backend/cms/src/main/resources/db/migration/V7__news_mobile_image.sql',
  import.meta.url
);
const repositorySource = readFileSync(new URL('./repositories.ts', import.meta.url), 'utf8');
const validationSource = readFileSync(new URL('./validation.ts', import.meta.url), 'utf8');
const snapshotSource = readFileSync(new URL('./static-snapshot-core.ts', import.meta.url), 'utf8');
const publicContentSource = readFileSync(new URL('./public-content.ts', import.meta.url), 'utf8');
const backendRepositorySource = readFileSync(
  new URL('../../backend/cms/src/main/java/com/daeho/cms/repository/CmsRepository.java', import.meta.url),
  'utf8'
);
const backendValidationSource = readFileSync(
  new URL('../../backend/cms/src/main/java/com/daeho/cms/service/RequestValidation.java', import.meta.url),
  'utf8'
);
const newsFormSource = readFileSync(
  new URL('../../app/admin/_components/news-form.tsx', import.meta.url),
  'utf8'
);
const adminActionsSource = readFileSync(new URL('../../app/admin/actions.ts', import.meta.url), 'utf8');
const newsGridSource = readFileSync(
  new URL('../../components/news/news-journal-grid.tsx', import.meta.url),
  'utf8'
);
const homeNewsSource = readFileSync(
  new URL('../../components/home/home-news-popups.tsx', import.meta.url),
  'utf8'
);

test('News mobileImagePath is added non-destructively through Flyway V7 and both APIs', () => {
  assert.equal(existsSync(migrationUrl), true, 'Flyway V7 migration should exist');
  assert.match(readFileSync(migrationUrl, 'utf8'), /ADD COLUMN IF NOT EXISTS mobile_image_path/i);
  assert.match(repositorySource, /mobileImagePath: string/);
  assert.match(validationSource, /mobileImagePath: optionalText/);
  assert.match(backendValidationSource, /putIfAbsent\("mobileImagePath", ""\)/);
  assert.match(backendRepositorySource, /mobile_image_path/);
  assert.match(backendRepositorySource, /"mobileImagePath"/);
});
test('News mobile images flow through snapshots, CMS editing, public cards and both card surfaces', () => {
  assert.match(snapshotSource, /mobileImagePath: stringValue\(row\.mobile_image_path\)/);
  assert.match(newsFormSource, /ResponsiveImageUploadField/);
  assert.match(newsFormSource, /mobileImagePath/);
  assert.match(adminActionsSource, /mobileImagePath/);
  assert.match(publicContentSource, /mobileImage: cmsImageName\(item\.mobileImagePath\)/);
  assert.match(newsGridSource, /mobileFilename=\{card\.mobileImage\}/);
  assert.match(homeNewsSource, /mobileFilename=\{card\.mobileImage\}/);
});
