import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import ts from 'typescript';

import {buildTechniqueRecordLocales, pairTechniqueRecords} from './technique-records-core.mjs';

function localeRecord(overrides = {}) {
  return {
    number: '01',
    title: '',
    scope: '',
    status: '',
    body: '',
    image: '',
    ...overrides
  };
}

function draft(id, title, image = `${id}.png`) {
  return {
    id,
    image,
    ko: {title: `KO ${title}`, scope: `KO scope ${title}`, status: `KO status ${title}`, body: `KO body ${title}`},
    en: {title: `EN ${title}`, scope: `EN scope ${title}`, status: `EN status ${title}`, body: `EN body ${title}`}
  };
}

test('pairs legacy locale records by index without losing localized text', () => {
  const drafts = pairTechniqueRecords(
    [
      localeRecord({
        title: '국문 기술',
        scope: '국문 범위',
        status: '확인 예정',
        body: '국문 설명',
        image: 'ko-record.png'
      })
    ],
    [
      localeRecord({
        title: 'English technique',
        scope: 'English scope',
        status: 'Pending review',
        body: 'English body',
        image: 'en-record.png'
      })
    ]
  );

  assert.deepEqual(drafts, [
    {
      id: 'technique-record-01',
      image: 'ko-record.png',
      ko: {
        title: '국문 기술',
        scope: '국문 범위',
        status: '확인 예정',
        body: '국문 설명'
      },
      en: {
        title: 'English technique',
        scope: 'English scope',
        status: 'Pending review',
        body: 'English body'
      }
    }
  ]);
});

test('pairs records by stable ID when locale order differs', () => {
  const drafts = pairTechniqueRecords(
    [
      localeRecord({id: 'record-a', title: '국문 A', image: 'ko-a.png'}),
      localeRecord({id: 'record-b', title: '국문 B', image: 'ko-b.png'})
    ],
    [
      localeRecord({id: 'record-b', title: 'English B', image: 'en-b.png'}),
      localeRecord({id: 'record-a', title: 'English A', image: 'en-a.png'})
    ]
  );

  assert.deepEqual(
    drafts.map((draft) => ({id: draft.id, image: draft.image, koTitle: draft.ko.title, enTitle: draft.en.title})),
    [
      {id: 'record-a', image: 'ko-a.png', koTitle: '국문 A', enTitle: 'English A'},
      {id: 'record-b', image: 'ko-b.png', koTitle: '국문 B', enTitle: 'English B'}
    ]
  );
});

test('falls back to index pairing when either locale contains duplicate IDs', () => {
  const cases = [
    {
      duplicateLocale: 'KO',
      koItems: [
        localeRecord({id: 'record-a', title: 'KO first'}),
        localeRecord({id: 'record-a', title: 'KO second'})
      ],
      enItems: [
        localeRecord({id: 'record-a', title: 'EN first'}),
        localeRecord({id: 'record-b', title: 'EN second'})
      ]
    },
    {
      duplicateLocale: 'EN',
      koItems: [
        localeRecord({id: 'record-a', title: 'KO first'}),
        localeRecord({id: 'record-b', title: 'KO second'})
      ],
      enItems: [
        localeRecord({id: 'record-a', title: 'EN first'}),
        localeRecord({id: 'record-a', title: 'EN second'})
      ]
    }
  ];

  for (const {duplicateLocale, koItems, enItems} of cases) {
    const drafts = pairTechniqueRecords(koItems, enItems);

    assert.deepEqual(
      drafts.map(({id, ko, en}) => ({id, koTitle: ko.title, enTitle: en.title})),
      [
        {id: 'technique-record-01', koTitle: 'KO first', enTitle: 'EN first'},
        {id: 'technique-record-02', koTitle: 'KO second', enTitle: 'EN second'}
      ],
      `${duplicateLocale} duplicates should preserve every row through index pairing`
    );
  }
});

test('returns safe unique draft IDs when paired record IDs need sanitizing', () => {
  const drafts = pairTechniqueRecords(
    [
      localeRecord({id: ' Record / One ', title: '국문 A'}),
      localeRecord({id: 'Record@One', title: '국문 B'})
    ],
    [
      localeRecord({id: ' Record / One ', title: 'English A'}),
      localeRecord({id: 'Record@One', title: 'English B'})
    ]
  );

  assert.deepEqual(drafts.map(({id}) => id), ['Record-One', 'technique-record-02']);
});

test('retains unmatched ID records instead of dropping locale text', () => {
  const drafts = pairTechniqueRecords(
    [localeRecord({id: 'record-a', title: '국문 A'})],
    [
      localeRecord({id: 'record-a', title: 'English A'}),
      localeRecord({id: 'record-b', title: 'English B', image: 'en-b.png'})
    ]
  );

  assert.deepEqual(
    drafts.map((item) => ({id: item.id, koTitle: item.ko.title, enTitle: item.en.title, image: item.image})),
    [
      {id: 'record-a', koTitle: '국문 A', enTitle: 'English A', image: ''},
      {id: 'record-b', koTitle: '', enTitle: 'English B', image: 'en-b.png'}
    ]
  );
});

test('uses the English image when the paired Korean image is blank', () => {
  const [draft] = pairTechniqueRecords(
    [localeRecord({title: '국문', image: ''})],
    [localeRecord({title: 'English', image: 'english-fallback.png'})]
  );

  assert.equal(draft.image, 'english-fallback.png');
});

test('returns one blank draft when both locale arrays are empty', () => {
  assert.deepEqual(pairTechniqueRecords([], []), [
    {
      id: 'technique-record-01',
      image: '',
      ko: {title: '', scope: '', status: '', body: ''},
      en: {title: '', scope: '', status: '', body: ''}
    }
  ]);
});

test('applies add, delete, and reorder changes to both locale arrays', () => {
  const original = [draft('record-a', 'A'), draft('record-b', 'B'), draft('record-c', 'C')];
  const added = draft('record-new', 'New', 'shared-new.png');
  const locales = buildTechniqueRecordLocales([original[2], added, original[0]]);

  assert.deepEqual(
    locales.ko.map(({id, title, image}) => ({id, title, image})),
    [
      {id: 'record-c', title: 'KO C', image: 'record-c.png'},
      {id: 'record-new', title: 'KO New', image: 'shared-new.png'},
      {id: 'record-a', title: 'KO A', image: 'record-a.png'}
    ]
  );
  assert.deepEqual(
    locales.en.map(({id, title, image}) => ({id, title, image})),
    [
      {id: 'record-c', title: 'EN C', image: 'record-c.png'},
      {id: 'record-new', title: 'EN New', image: 'shared-new.png'},
      {id: 'record-a', title: 'EN A', image: 'record-a.png'}
    ]
  );
});

test('regenerates zero-padded record numbers in both locales', () => {
  const locales = buildTechniqueRecordLocales([draft('record-a', 'A'), draft('record-b', 'B'), draft('record-c', 'C')]);

  assert.deepEqual(locales.ko.map(({number}) => number), ['01', '02', '03']);
  assert.deepEqual(locales.en.map(({number}) => number), ['01', '02', '03']);
});

test('sanitizes IDs and replaces duplicate or missing IDs deterministically', () => {
  const locales = buildTechniqueRecordLocales([
    draft(' Record / One ', 'A'),
    draft('Record@One', 'B'),
    draft(undefined, 'C')
  ]);
  const expectedIds = ['Record-One', 'technique-record-02', 'technique-record-03'];

  assert.deepEqual(locales.ko.map(({id}) => id), expectedIds);
  assert.deepEqual(locales.en.map(({id}) => id), expectedIds);
  assert.ok(expectedIds.every((id) => /^[A-Za-z0-9_-]+$/.test(id)));
});

test('builds one blank record per locale when no drafts remain', () => {
  const locales = buildTechniqueRecordLocales([]);
  const blankRecord = {
    id: 'technique-record-01',
    number: '01',
    title: '',
    scope: '',
    status: '',
    body: '',
    image: ''
  };

  assert.deepEqual(locales, {ko: [blankRecord], en: [blankRecord]});
});

test('publishes the locale record and bilingual draft TypeScript contract', () => {
  const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
  const declarationPath = fileURLToPath(new URL('./technique-records-core.d.ts', import.meta.url));
  const tempDir = mkdtempSync(path.join(tmpdir(), 'daeho-technique-types-'));
  const consumerPath = path.join(tempDir, 'consumer.ts');

  try {
    writeFileSync(
      consumerPath,
      `
        import {
          buildTechniqueRecordLocales,
          pairTechniqueRecords,
          type TechniqueLocaleRecord,
          type TechniqueRecordDraft
        } from '@/lib/cms/technique-records-core.mjs';

        const localeRecord: TechniqueLocaleRecord = {
          id: 'record-a',
          number: '01',
          title: 'Title',
          scope: 'Scope',
          status: 'Status',
          body: 'Body',
          image: 'record.png'
        };
        const drafts: TechniqueRecordDraft[] = pairTechniqueRecords([localeRecord], [localeRecord]);
        const locales: {ko: TechniqueLocaleRecord[]; en: TechniqueLocaleRecord[]} =
          buildTechniqueRecordLocales(drafts);

        void locales;
      `,
      'utf8'
    );

    const rootNames = [consumerPath];

    if (existsSync(declarationPath)) {
      rootNames.push(declarationPath);
    }

    const program = ts.createProgram(rootNames, {
      baseUrl: projectRoot,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: true,
      paths: {'@/*': ['./*']},
      skipLibCheck: false,
      strict: true,
      target: ts.ScriptTarget.ES2022
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    const diagnosticText = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => projectRoot,
      getNewLine: () => '\n'
    });

    assert.equal(diagnosticText, '');
  } finally {
    rmSync(tempDir, {force: true, recursive: true});
  }
});
