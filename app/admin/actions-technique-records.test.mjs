import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8');

test('Technique page saves normalize the bilingual record manifest before payload validation', () => {
  assert.match(source, /normalizeSubmittedTechniqueRecords/);
  assert.match(source, /pageKey === 'mastery-technique'/);
  assert.match(source, /stringFromForm\(formData, 'techniqueRecords\.ids'\)/);
  assert.match(source, /stringFromForm\(formData, 'techniqueRecords\.length'\)/);
  assert.match(source, /getObjectValueAtPath\(contentKo, 'records\.items'\)/);
  assert.match(source, /setObjectValueAtPath\(contentEn, 'records\.items', normalizedRecords\.en\)/);

  const normalizeIndex = source.indexOf('const normalizedRecords = normalizeSubmittedTechniqueRecords');
  const parseIndex = source.indexOf('const payload = pagePayloadSchema.parse');

  assert.ok(normalizeIndex >= 0, 'Technique records should be normalized');
  assert.ok(parseIndex > normalizeIndex, 'normalization must happen before page payload validation');
});
