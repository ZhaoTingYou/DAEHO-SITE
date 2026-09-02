import assert from 'node:assert/strict';
import test from 'node:test';

process.env.CUSTOMER_GRANT_VALIDATION_URL = 'https://daeho.example/internal/cognito/registration-grants/validate';
process.env.CUSTOMER_INTERNAL_API_KEY = 'test-internal-key';
process.env.CUSTOM_USERNAME_POOL_ID = 'ap-northeast-2_usernamePool';

const {handler} = await import('./index.mjs');

test('allows only a matching verified SMS registration grant', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.headers['x-customer-service-key'], 'test-internal-key');
    assert.deepEqual(JSON.parse(init.body), {registrationGrant: 'grant-value'});
    return new Response(JSON.stringify({
      method: 'sms_declaration', phone: '+821012345678', adultVerified: true
    }), {status: 200});
  };
  const event = signupEvent('+821012345678');

  const result = await handler(event);

  assert.equal(result.response.autoConfirmUser, true);
  assert.equal(result.response.autoVerifyPhone, true);
});

test('rejects a grant verified for a different phone', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => new Response(JSON.stringify({
    method: 'sms_declaration', phone: '+821099999999', adultVerified: true
  }), {status: 200});

  await assert.rejects(() => handler(signupEvent('+821012345678')), /does not match/);
});

test('rejects registration without a valid phone attribute', async () => {
  await assert.rejects(() => handler(signupEvent('not-a-phone')), /Verified registration is required/);
});

test('username pool accepts only a normalized DAEHO login name', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => new Response(JSON.stringify({
    method: 'sms_declaration', phone: '+821012345678', adultVerified: true
  }), {status: 200});

  const valid = signupEvent('+821012345678');
  valid.userPoolId = 'ap-northeast-2_usernamePool';
  valid.userName = 'daeho.member';
  assert.equal((await handler(valid)).response.autoConfirmUser, true);

  for (const invalidName of ['01012345678', 'Daeho.Member', 'ab', 'member name']) {
    const invalid = signupEvent('+821012345678');
    invalid.userPoolId = 'ap-northeast-2_usernamePool';
    invalid.userName = invalidName;
    await assert.rejects(() => handler(invalid), /Login name is invalid/);
  }
});

function signupEvent(phone) {
  return {
    triggerSource: 'PreSignUp_SignUp',
    // Cognito uses an internal UUID here when phone_number is a username attribute.
    userName: '7ca74d47-f22e-41a6-8cb7-b5d3f9ee5cc4',
    request: {
      clientMetadata: {registrationGrant: 'grant-value'},
      userAttributes: {phone_number: phone}
    },
    response: {}
  };
}
