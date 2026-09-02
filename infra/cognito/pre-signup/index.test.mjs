import assert from 'node:assert/strict';
import test from 'node:test';

process.env.CUSTOMER_GRANT_VALIDATION_URL = 'https://daeho.example/internal/cognito/registration-grants/validate';
process.env.CUSTOMER_INTERNAL_API_KEY = 'test-internal-key';

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

function signupEvent(phone) {
  return {
    triggerSource: 'PreSignUp_SignUp',
    userName: phone,
    request: {
      clientMetadata: {registrationGrant: 'grant-value'},
      userAttributes: {phone_number: phone}
    },
    response: {}
  };
}
