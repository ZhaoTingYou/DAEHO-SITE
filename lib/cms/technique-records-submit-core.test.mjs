import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import test from 'node:test';

const moduleUrl = new URL('./technique-records-submit-core.mjs', import.meta.url);
const {normalizeSubmittedTechniqueRecords} = await import(moduleUrl);

function record(overrides = {}) {
  return {
    title: '',
    body: '',
    image: '',
    ...overrides
  };
}

test('Technique record submit normalizer exists as a focused pure module', () => {
  assert.equal(existsSync(moduleUrl), true);
});

test('exports the Technique record submit normalizer', () => {
  assert.equal(typeof normalizeSubmittedTechniqueRecords, 'function');
});

test('applies submitted visual IDs and keeps at least three shared slides', () => {
  const result = normalizeSubmittedTechniqueRecords({
    koItems: [
      record({id: 'legacy-a', title: '케이 비', image: 'b.png'}),
      record({id: 'legacy-b', title: '케이 에이', image: 'a.png'})
    ],
    enItems: [
      record({id: 'legacy-a', title: 'EN B', image: 'old-b.png'}),
      record({id: 'legacy-b', title: 'EN A', image: 'old-a.png'})
    ],
    submittedIds: JSON.stringify(['record-b', 'record-a']),
    submittedLength: '2'
  });

  assert.equal(result.ko.length, 3);
  assert.deepEqual(result.ko.slice(0, 2).map(({id, title, image}) => ({id, title, image})), [
    {id: 'record-b', title: '케이 비', image: 'b.png'},
    {id: 'record-a', title: '케이 에이', image: 'a.png'}
  ]);
  assert.deepEqual(result.en.slice(0, 2).map(({id, title, image}) => ({id, title, image})), [
    {id: 'record-b', title: 'EN B', image: 'b.png'},
    {id: 'record-a', title: 'EN A', image: 'a.png'}
  ]);
});

test('submitted deletion cannot reduce the carousel below three items', () => {
  const result = normalizeSubmittedTechniqueRecords({
    koItems: [record({title: 'KO 1'}), record({title: 'KO 2'}), record({title: 'KO 3'})],
    enItems: [record({title: 'EN 1'}), record({title: 'EN 2'}), record({title: 'EN 3'})],
    submittedIds: '["kept"]',
    submittedLength: '1'
  });

  assert.equal(result.ko.length, 3);
  assert.equal(result.en.length, 3);
  assert.equal(result.ko[0].title, 'KO 1');
  assert.equal(result.en[0].title, 'EN 1');
});

test('submitted length pads newly appended rows and keeps locale arrays aligned', () => {
  const result = normalizeSubmittedTechniqueRecords({
    koItems: [record({title: '기존'})],
    enItems: [record({title: 'Existing'})],
    submittedIds: '["existing","new-2","new-3"]',
    submittedLength: '3'
  });

  assert.equal(result.ko.length, 3);
  assert.equal(result.en.length, 3);
  assert.deepEqual(result.ko.map((item) => item.id), ['existing', 'new-2', 'new-3']);
  assert.equal(result.ko[2].title, '');
});

test('malformed manifests fall back without losing existing content', () => {
  const result = normalizeSubmittedTechniqueRecords({
    koItems: [record({id: 'one', title: 'KO 1'}), record({id: 'two', title: 'KO 2'})],
    enItems: [record({id: 'one', title: 'EN 1'}), record({id: 'two', title: 'EN 2'})],
    submittedIds: '{not json',
    submittedLength: 'invalid'
  });

  assert.equal(result.ko.length, 3);
  assert.equal(result.en.length, 3);
  assert.deepEqual(result.ko.slice(0, 2).map((item) => item.title), ['KO 1', 'KO 2']);
  assert.deepEqual(result.en.slice(0, 2).map((item) => item.title), ['EN 1', 'EN 2']);
});

test('uses English image only when the submitted Korean image is blank', () => {
  const result = normalizeSubmittedTechniqueRecords({
    koItems: [record({title: 'KO', image: ''})],
    enItems: [record({title: 'EN', image: 'english.png'})],
    submittedIds: '["shared"]',
    submittedLength: '1'
  });

  assert.equal(result.ko[0].image, 'english.png');
  assert.equal(result.en[0].image, 'english.png');
});

test('always preserves at least three bilingual carousel items', () => {
  const result = normalizeSubmittedTechniqueRecords({
    koItems: [],
    enItems: [],
    submittedIds: '[]',
    submittedLength: '0'
  });

  assert.equal(result.ko.length, 3);
  assert.equal(result.en.length, 3);
});

test('strips retired number, scope, and status fields from saved carousel items', () => {
  const result = normalizeSubmittedTechniqueRecords({
    koItems: [record({number: '01', scope: '범위', status: '상태', title: 'KO'})],
    enItems: [record({number: '01', scope: 'Scope', status: 'Status', title: 'EN'})],
    submittedIds: '["one","two","three"]',
    submittedLength: '3'
  });

  assert.deepEqual(Object.keys(result.ko[0]).sort(), ['body', 'id', 'image', 'title']);
  assert.deepEqual(Object.keys(result.en[0]).sort(), ['body', 'id', 'image', 'title']);
});
