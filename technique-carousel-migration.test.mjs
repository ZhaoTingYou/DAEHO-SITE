import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const migrationUrl = new URL(
  './backend/cms/src/main/resources/db/migration/V5__technique_carousel_content.sql',
  import.meta.url
);
const migrationSource = existsSync(migrationUrl) ? readFileSync(migrationUrl, 'utf8') : '';

test('Technique carousel migration exists and targets both current and legacy CMS page locations', () => {
  assert.equal(existsSync(migrationUrl), true);
  assert.match(migrationSource, /page_key = 'mastery-technique'/);
  assert.match(migrationSource, /page_key = 'specialtyPages'/);
  assert.match(migrationSource, /\{__groups,main\}/);
  assert.match(migrationSource, /\{techniqueRecords\}/);
});

test('Technique carousel migration keeps Hero and only the four public slide fields', () => {
  assert.match(migrationSource, /jsonb_build_object\(\s*'hero'/);
  assert.match(migrationSource, /'records',\s*jsonb_build_object\('items'/);
  assert.match(migrationSource, /'id'/);
  assert.match(migrationSource, /'image'/);
  assert.match(migrationSource, /'title'/);
  assert.match(migrationSource, /'body'/);
  assert.doesNotMatch(migrationSource, /'number'|'scope'|'status'|'standards'|'evidence'|'cta'/);
});

test('Technique carousel migration pads fewer than three existing slides and generates stable fallback IDs', () => {
  assert.match(migrationSource, /GREATEST\(3, jsonb_array_length\(items\)\)/);
  assert.match(migrationSource, /technique-record-/);
  assert.match(migrationSource, /lpad\(\(item_index \+ 1\)::text, 2, '0'\)/);
});

test('Technique carousel migration updates both locales and removes its temporary helper', () => {
  assert.match(migrationSource, /content_ko = CASE/);
  assert.match(migrationSource, /content_en = CASE/);
  assert.match(migrationSource, /DROP FUNCTION daeho_clean_technique_section/);
});
