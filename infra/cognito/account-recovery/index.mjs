import {timingSafeEqual} from 'node:crypto';

import {
  AdminSetUserPasswordCommand,
  AdminUserGlobalSignOutCommand,
  CognitoIdentityProviderClient
} from '@aws-sdk/client-cognito-identity-provider';

const defaultClient = new CognitoIdentityProviderClient({});

export function createHandler({
  internalSecret = process.env.CUSTOMER_INTERNAL_API_KEY ?? '',
  userPoolId = process.env.COGNITO_USER_POOL_ID ?? '',
  cognitoClient = defaultClient
} = {}) {
  return async function accountRecoveryHandler(event) {
    if (event?.requestContext?.http?.method !== 'POST') return response(405, 'method_not_allowed');
    if (Buffer.byteLength(internalSecret, 'utf8') < 32 || !userPoolId) {
      return response(503, 'unavailable');
    }
    if (!secretsMatch(header(event.headers, 'x-customer-service-key'), internalSecret)) {
      return response(401, 'unauthorized');
    }

    const input = parseBody(event);
    const action = typeof input.action === 'string' ? input.action : '';
    const loginName = typeof input.loginName === 'string' ? input.loginName : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (!validLoginName(loginName)
        || (action === 'setPassword' && !validPassword(password))
        || (action !== 'signOut' && action !== 'setPassword')) {
      return response(400, 'invalid_request');
    }

    try {
      if (action === 'signOut') {
        await cognitoClient.send(new AdminUserGlobalSignOutCommand({
          UserPoolId: userPoolId,
          Username: loginName
        }));
      } else {
        await cognitoClient.send(new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: loginName,
          Password: password,
          Permanent: true
        }));
      }
      return {statusCode: 204, headers: securityHeaders(), body: ''};
    } catch (error) {
      console.error('Cognito account recovery provider request failed', {
        type: error instanceof Error ? error.name : 'UnknownError'
      });
      return response(502, 'provider_unavailable');
    }
  };
}

export const handler = createHandler();

function parseBody(event) {
  try {
    const raw = event?.isBase64Encoded
      ? Buffer.from(String(event.body ?? ''), 'base64').toString('utf8')
      : String(event?.body ?? '');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function header(headers, name) {
  if (!headers || typeof headers !== 'object') return '';
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
  return typeof entry?.[1] === 'string' ? entry[1] : '';
}

function secretsMatch(received, expected) {
  const actualBuffer = Buffer.from(String(received));
  const expectedBuffer = Buffer.from(String(expected));
  if (actualBuffer.length !== expectedBuffer.length) {
    timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function validLoginName(value) {
  return /^[a-z][a-z0-9._-]{3,23}$/.test(value);
}

function validPassword(value) {
  return value.length >= 8 && value.length <= 256
    && /[A-Z]/.test(value)
    && /[a-z]/.test(value)
    && /[0-9]/.test(value)
    && /[\p{P}\p{S}]/u.test(value);
}

function response(statusCode, error) {
  return {
    statusCode,
    headers: {'content-type': 'application/json', ...securityHeaders()},
    body: JSON.stringify({error})
  };
}

function securityHeaders() {
  return {
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  };
}
