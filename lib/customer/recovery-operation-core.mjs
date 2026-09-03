import {createHmac} from 'node:crypto';

export function bindPasswordRecoveryOperation({
  operationKey,
  loginName,
  password,
  secret
}) {
  return createHmac('sha256', secret)
    .update(operationKey)
    .update('\0')
    .update(loginName)
    .update('\0')
    .update(password)
    .digest('base64url');
}

export function classifyRecoveryFunctionResponse(status) {
  if (status === 204) return 'success';
  if ([400, 401, 405].includes(status)) return 'definiteFailure';
  return 'unknown';
}
