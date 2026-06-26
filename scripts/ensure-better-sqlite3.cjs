#!/usr/bin/env node

const {spawnSync} = require('node:child_process');

let loadError;

function canLoadBetterSqlite() {
  try {
    require('better-sqlite3');
    return true;
  } catch (error) {
    loadError = error;
    return false;
  }
}

if (canLoadBetterSqlite()) {
  process.exit(0);
}

const reason = loadError?.message?.split('\n')[0] ?? 'unknown error';
console.log(`[setup] better-sqlite3 needs rebuild: ${reason}`);

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const rebuild = spawnSync(npmCommand, ['rebuild', 'better-sqlite3'], {
  stdio: 'inherit',
});

if (rebuild.status !== 0) {
  process.exit(rebuild.status ?? 1);
}

if (!canLoadBetterSqlite()) {
  console.error('[setup] better-sqlite3 still cannot be loaded after rebuild.');
  console.error(loadError);
  process.exit(1);
}

console.log('[setup] better-sqlite3 is ready.');
