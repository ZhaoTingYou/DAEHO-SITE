import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);

  let depth = 0;
  let bodyStart = -1;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
      bodyStart = bodyStart === -1 ? index : bodyStart;
    } else if (char === '}') {
      depth -= 1;
      if (bodyStart !== -1 && depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  throw new Error(`Unable to extract ${name}`);
}

test('changeAdminPasswordAction does not classify successful session cleanup or redirect as password failure', () => {
  const actionSource = extractFunction('changeAdminPasswordAction');
  const catchIndex = actionSource.indexOf('} catch (error) {');
  const clearSessionIndex = actionSource.indexOf('await clearAdminSession();');
  const successRedirectIndex = actionSource.indexOf("redirect('/admin/login?status=password-updated')");

  assert.ok(catchIndex > -1, 'password backend errors should still be handled');
  assert.ok(clearSessionIndex > catchIndex, 'session cleanup should run after the backend error catch');
  assert.ok(successRedirectIndex > catchIndex, 'success redirect should run after the backend error catch');
  assert.ok(clearSessionIndex < successRedirectIndex, 'session is cleared before redirecting to login');
});
