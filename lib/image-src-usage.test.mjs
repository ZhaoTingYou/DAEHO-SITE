import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import test from 'node:test';

test('tsx image components do not prepend /images to dynamic values directly', () => {
  let output = '';

  try {
    output = execFileSync('rg', ['-n', 'src=\\{`/images/\\$\\{', '--glob', '*.tsx', 'app', 'components', 'lib'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    output = error.stdout || '';
  }

  assert.equal(output.trim(), '');
});
