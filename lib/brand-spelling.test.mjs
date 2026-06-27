import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const forbiddenBrands = [
  ['DE', 'AHO'].join(''),
  ['De', 'aho'].join(''),
  ['de', 'aho'].join('')
];
const scannedExtensions = new Set([
  '.css',
  '.html',
  '.java',
  '.js',
  '.json',
  '.jsx',
  '.mjs',
  '.sql',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yml',
  '.yaml'
]);

test('tracked paths and text content use the DAEHO/daeho brand spelling', () => {
  const offenders = [];
  const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
    cwd: projectRoot,
    encoding: 'utf8'
  }).split('\0').filter(Boolean);

  for (const relativePath of trackedFiles) {
    for (const forbiddenBrand of forbiddenBrands) {
      if (relativePath.includes(forbiddenBrand)) {
        offenders.push(`${relativePath}: path contains ${forbiddenBrand}`);
      }
    }

    if (!scannedExtensions.has(path.extname(relativePath))) {
      continue;
    }

    const text = readFileSync(path.join(projectRoot, relativePath), 'utf8');
    const lines = text.split('\n');

    for (const [index, line] of lines.entries()) {
      for (const forbiddenBrand of forbiddenBrands) {
        if (line.includes(forbiddenBrand)) {
          offenders.push(`${relativePath}:${index + 1}: ${line.trim()}`);
        }
      }
    }
  }

  assert.deepEqual(offenders, []);
});
