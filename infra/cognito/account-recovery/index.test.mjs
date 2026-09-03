import assert from 'node:assert/strict';
import test from 'node:test';

const {createHandler} = await import('./index.mjs');

test('signs out the recovered account before password mutation is authorized', async () => {
  const calls = [];
  const handler = createHandler({
    internalSecret: 'long-test-internal-secret-that-is-over-32-bytes',
    userPoolId: 'ap-northeast-2_testPool',
    cognitoClient: {send: async (command) => calls.push(command)}
  });

  const response = await handler(request({action: 'signOut', loginName: 'daeho.member'}));

  assert.equal(response.statusCode, 204);
  assert.deepEqual(calls.map((command) => command.constructor.name), [
    'AdminUserGlobalSignOutCommand'
  ]);
  assert.deepEqual(calls[0].input, {
    UserPoolId: 'ap-northeast-2_testPool',
    Username: 'daeho.member'
  });
  assert.equal(response.body, '');
});

test('sets a permanent password only in the second recovery phase', async () => {
  const calls = [];
  const handler = createHandler({
    internalSecret: 'long-test-internal-secret-that-is-over-32-bytes',
    userPoolId: 'ap-northeast-2_testPool',
    cognitoClient: {send: async (command) => calls.push(command)}
  });

  const response = await handler(request({
    action: 'setPassword', loginName: 'daeho.member', password: 'NewPass1!'
  }));

  assert.equal(response.statusCode, 204);
  assert.deepEqual(calls.map((command) => command.constructor.name), [
    'AdminSetUserPasswordCommand'
  ]);
  assert.deepEqual(calls[0].input, {
    UserPoolId: 'ap-northeast-2_testPool',
    Username: 'daeho.member',
    Password: 'NewPass1!',
    Permanent: true
  });
});

test('rejects requests without the constant internal service secret', async () => {
  let called = false;
  const handler = createHandler({
    internalSecret: 'long-test-internal-secret-that-is-over-32-bytes',
    userPoolId: 'ap-northeast-2_testPool',
    cognitoClient: {send: async () => { called = true; }}
  });

  const response = await handler(request(
    {loginName: 'daeho.member', password: 'NewPass1!'},
    {'x-customer-service-key': 'wrong'}
  ));

  assert.equal(response.statusCode, 401);
  assert.equal(called, false);
  assert.doesNotMatch(response.body, /secret|daeho\.member|NewPass1!/i);
});

test('rejects invalid usernames and passwords before calling Cognito', async () => {
  let callCount = 0;
  const handler = createHandler({
    internalSecret: 'long-test-internal-secret-that-is-over-32-bytes',
    userPoolId: 'ap-northeast-2_testPool',
    cognitoClient: {send: async () => { callCount += 1; }}
  });

  for (const body of [
    {action: 'signOut', loginName: '01092070465'},
    {action: 'setPassword', loginName: 'daeho.member', password: 'alllowercase1!'},
    {action: 'setPassword', loginName: 'daeho.member', password: 'NoSymbol123'},
    {action: 'unsupported', loginName: 'daeho.member', password: 'NewPass1!'}
  ]) {
    assert.equal((await handler(request(body))).statusCode, 400);
  }
  assert.equal(callCount, 0);
});

test('requires POST and reports provider failures without leaking account data', async () => {
  const handler = createHandler({
    internalSecret: 'long-test-internal-secret-that-is-over-32-bytes',
    userPoolId: 'ap-northeast-2_testPool',
    cognitoClient: {send: async () => { throw new Error('provider detail for daeho.member'); }}
  });
  const getResponse = await handler({...request({}), requestContext: {http: {method: 'GET'}}});
  const failedResponse = await handler(request({action: 'signOut', loginName: 'daeho.member'}));

  assert.equal(getResponse.statusCode, 405);
  assert.equal(failedResponse.statusCode, 502);
  assert.doesNotMatch(failedResponse.body, /daeho\.member|provider detail|NewPass1!/i);
});

test('refuses to start when the public Function URL secret is too short', async () => {
  let called = false;
  const handler = createHandler({
    internalSecret: 'short-secret',
    userPoolId: 'ap-northeast-2_testPool',
    cognitoClient: {send: async () => { called = true; }}
  });

  const response = await handler(request(
    {action: 'signOut', loginName: 'daeho.member'},
    {'x-customer-service-key': 'short-secret'}
  ));

  assert.equal(response.statusCode, 503);
  assert.equal(called, false);
});

function request(body, headers = {
  'x-customer-service-key': 'long-test-internal-secret-that-is-over-32-bytes'
}) {
  return {
    requestContext: {http: {method: 'POST'}},
    headers,
    body: JSON.stringify(body),
    isBase64Encoded: false
  };
}
