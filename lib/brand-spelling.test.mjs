import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const forbiddenBrand = ['DE', 'AHO'].join('');
const scanTargets = [
  'app',
  'components',
  'lib',
  'messages',
  'data/cms-preview.json',
  'backend/cms/src',
  'backend/cms/pom.xml',
  'next.config.ts',
  'scripts'
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
const ignoredDirectories = new Set(['.next', '.git', 'node_modules', 'target', 'out']);

test('public site and CMS content use the DAEHO brand spelling', () => {
  const offenders = [];

  for (const target of scanTargets) {
    for (const filePath of walk(path.join(projectRoot, target))) {
      const text = readFileSync(filePath, 'utf8');
      if (!text.includes(forbiddenBrand)) {
        continue;
      }

      const relativePath = path.relative(projectRoot, filePath);
      const lines = text.split('\n');
      for (const [index, line] of lines.entries()) {
        if (line.includes(forbiddenBrand)) {
          offenders.push(`${relativePath}:${index + 1}: ${line.trim()}`);
        }
      }
    }
  }

  assert.deepEqual(offenders, []);
});

function* walk(filePath) {
  const stats = statSync(filePath);
  if (stats.isDirectory()) {
    if (ignoredDirectories.has(path.basename(filePath))) {
      return;
    }

    for (const entry of readdirSync(filePath)) {
      yield* walk(path.join(filePath, entry));
    }
    return;
  }

  if (stats.isFile() && scannedExtensions.has(path.extname(filePath))) {
    yield filePath;
  }
}
