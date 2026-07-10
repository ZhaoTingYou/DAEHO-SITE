import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import test from 'node:test';

const moduleUrl = new URL('./technique-records-submit-core.mjs', import.meta.url);
const {normalizeSubmittedTechniqueRecords} = await import(moduleUrl);

function record(overrides = {}) {
  return {
    number: '',
    title: '',
    scope: '',
    status: '',
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

test('applies submitted visual IDs and regenerates shared numbering', () => {
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

  assert.deepEqual(result.ko.map(({id, number, title, image}) => ({id, number, title, image})), [
    {id: 'record-b', number: '01', title: '케이 비', image: 'b.png'},
    {id: 'record-a', number: '02', title: '케이 에이', image: 'a.png'}
  ]);
  assert.deepEqual(result.en.map(({id, number, title, image}) => ({id, number, title, image})), [
    {id: 'record-b', number: '01', title: 'EN B', image: 'b.png'},
    {id: 'record-a', number: '02', title: 'EN A', image: 'a.png'}
  ]);
});

test('shorter submitted length deletes tail records from both locales', () => {
  const result = normalizeSubmittedTechniqueRecords({
    koItems: [record({title: 'KO 1'}), record({title: 'KO 2'}), record({title: 'KO 3'})],
    enItems: [record({title: 'EN 1'}), record({title: 'EN 2'}), record({title: 'EN 3'})],
    submittedIds: '["kept"]',
    submittedLength: '1'
  });

  assert.equal(result.ko.length, 1);
  assert.equal(result.en.length, 1);
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
  assert.deepEqual(result.en.map((item) => item.number), ['01', '02', '03']);
  assert.equal(result.ko[2].title, '');
});

test('malformed manifests fall back without losing existing content', () => {
  const result = normalizeSubmittedTechniqueRecords({
    koItems: [record({id: 'one', title: 'KO 1'}), record({id: 'two', title: 'KO 2'})],
    enItems: [record({id: 'one', title: 'EN 1'}), record({id: 'two', title: 'EN 2'})],
    submittedIds: '{not json',
    submittedLength: 'invalid'
  });

  assert.equal(result.ko.length, 2);
  assert.equal(result.en.length, 2);
  assert.deepEqual(result.ko.map((item) => item.title), ['KO 1', 'KO 2']);
  assert.deepEqual(result.en.map((item) => item.title), ['EN 1', 'EN 2']);
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

test('always preserves at least one bilingual record', () => {
  const result = normalizeSubmittedTechniqueRecords({
    koItems: [],
    enItems: [],
    submittedIds: '[]',
    submittedLength: '0'
  });

  assert.equal(result.ko.length, 1);
  assert.equal(result.en.length, 1);
  assert.equal(result.ko[0].number, '01');
});
