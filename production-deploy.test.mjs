import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const deploymentScriptUrl = new URL('./scripts/deploy-production.sh', import.meta.url);
const deploymentScriptPath = fileURLToPath(deploymentScriptUrl);

test('production deployment validates and reloads nginx after application recreation', () => {
  assert.equal(existsSync(deploymentScriptUrl), true, 'the production deployment script exists');

  const source = readFileSync(deploymentScriptUrl, 'utf8');
  const backupOffset = source.indexOf('pg_dump');
  const deployOffset = source.indexOf('up -d --build');
  const lockOffset = source.indexOf('mkdir "$lock_dir"');
  assert.ok(lockOffset >= 0 && lockOffset < backupOffset, 'an exclusive deployment lock is acquired');
  assert.match(source, /mktemp "\$backup_root\//);
  assert.match(source, /ln "\$partial_backup" "\$backup_path"/);
  assert.ok(backupOffset >= 0, 'a PostgreSQL backup is created');
  assert.ok(source.indexOf('gzip -t') > backupOffset, 'the backup is integrity checked');
  assert.ok(deployOffset > backupOffset, 'the backup completes before Flyway can start');
  assert.match(
    source,
    /docker compose -p "\$compose_project" up -d --build --wait --wait-timeout "\$wait_timeout" cms-api customer-api next nginx/
  );

  const validationOffset = source.indexOf('exec -T nginx nginx -t');
  const reloadOffset = source.indexOf('exec -T nginx nginx -s reload');
  assert.ok(validationOffset >= 0, 'nginx configuration is validated');
  assert.ok(reloadOffset > validationOffset, 'nginx is reloaded only after validation succeeds');
  assert.match(source, /api\/live-chat\/session/);
  assert.match(source, /test "\$http_status" = "200"/);
  assert.match(source, /test "\$site_status" = "200"/);
});

test('production backup refuses concurrent deployments and never replaces an existing file', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'daeho-deploy-test-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const fakeBin = path.join(root, 'bin');
  const backupRoot = path.join(root, 'backups');
  mkdirSync(fakeBin);
  const fakeDocker = path.join(fakeBin, 'docker');
  const fakeCurl = path.join(fakeBin, 'curl');
  writeFileSync(fakeDocker, `#!/bin/sh
case "$*" in
  *pg_dump*)
    if [ -n "$FAKE_DOCKER_DELAY" ]; then sleep "$FAKE_DOCKER_DELAY"; fi
    printf '%s\n' '-- verified test backup'
    ;;
esac
`, {mode: 0o755});
  writeFileSync(fakeCurl, "#!/bin/sh\nprintf '200'\n", {mode: 0o755});
  chmodSync(fakeDocker, 0o755);
  chmodSync(fakeCurl, 0o755);
  const timestamp = '20260903T000000Z';
  const environment = {
    ...process.env,
    PATH: `${fakeBin}:${process.env.PATH}`,
    COMPOSE_PROJECT_NAME: 'daeho-test',
    DEPLOY_BACKUP_ROOT: backupRoot,
    DEPLOY_TIMESTAMP: timestamp
  };

  const first = spawn(deploymentScriptPath, [], {
    env: {...environment, FAKE_DOCKER_DELAY: '1'},
    stdio: 'ignore'
  });
  await waitFor(() => existsSync(path.join(backupRoot, '.daeho-deploy.lock')));
  const concurrent = spawnSync(deploymentScriptPath, [], {
    env: environment,
    encoding: 'utf8'
  });
  assert.notEqual(concurrent.status, 0);
  assert.match(concurrent.stderr, /already running/);
  assert.equal(await exitCode(first), 0);

  const backupPath = path.join(backupRoot, `daeho-pre-deploy-${timestamp}.sql.gz`);
  const original = readFileSync(backupPath);
  const repeated = spawnSync(deploymentScriptPath, [], {
    env: environment,
    encoding: 'utf8'
  });
  assert.notEqual(repeated.status, 0);
  assert.deepEqual(readFileSync(backupPath), original);
});

async function waitFor(condition) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail('timed out waiting for deployment lock');
}

function exitCode(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code));
  });
}
