import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import test from 'node:test';

const migrationDirectory = new URL(
  './backend/cms/src/main/resources/db/migration/',
  import.meta.url
);

test('Flyway migration history stays contiguous for already deployed databases', () => {
  const versions = readdirSync(migrationDirectory)
    .map((fileName) => /^V(\d+)__.+\.sql$/.exec(fileName))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .sort((left, right) => left - right);

  assert.equal(versions[0], 1, 'migration history must begin at V1');

  for (let index = 1; index < versions.length; index += 1) {
    assert.equal(
      versions[index],
      versions[index - 1] + 1,
      `missing Flyway migration V${versions[index - 1] + 1}`
    );
  }
});
