import 'server-only';

import {NextResponse, type NextRequest} from 'next/server';

import {isSameOriginMutation} from './request-security';
import {
  bindPasswordRecoveryOperation,
  classifyRecoveryFunctionResponse,
  type RecoveryFunctionOutcome
} from './recovery-operation-core.mjs';
import {accountsEnabled, customerServiceHeaders} from './server';

export async function proxyRecoveryRequest(
  request: NextRequest,
  path: string,
  {idempotency = false}: {idempotency?: boolean} = {}
) {
  if (!(await accountsEnabled())) {
    return NextResponse.json({error: 'unavailable'}, {status: 404});
  }
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({error: 'invalidOrigin'}, {status: 403});
  }
  const baseUrl = process.env.CUSTOMER_BACKEND_URL?.replace(/\/+$/, '');
  if (!baseUrl) {
    return NextResponse.json({error: 'unavailable'}, {status: 503});
  }
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-forwarded-for': request.headers.get('x-daeho-client-ip')
      ?? request.headers.get('x-real-ip')
      ?? ''
  };
  if (idempotency) headers['idempotency-key'] = request.headers.get('idempotency-key') ?? '';
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: await request.text(),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000)
  }).catch(() => null);
  if (!response) {
    return NextResponse.json({error: 'unavailable'}, {status: 503});
  }
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {'content-type': response.headers.get('content-type') ?? 'application/json'}
  });
}

export async function reservePasswordRecoveryGrant(input: {
  recoveryGrant: string;
  loginName: string;
  operationKey: string;
}) {
  const response = await postRecoveryOperation('/v1/internal/recovery-grants/reserve', input);
  if (!response?.ok) return null;
  const payload = await response.json().catch(() => ({})) as {
    state?: string;
    stage?: string;
  };
  if (!['acquired', 'in_progress', 'completed'].includes(payload.state ?? '')) return null;
  if (!['reserved', 'sessions_invalidated'].includes(payload.stage ?? '')) return null;
  return payload as {
    state: 'acquired' | 'in_progress' | 'completed';
    stage: 'reserved' | 'sessions_invalidated';
  };
}

export async function invalidatePasswordRecoverySessions(input: {
  recoveryGrant: string;
  loginName: string;
  operationKey: string;
}) {
  return Boolean((await postRecoveryOperation(
    '/v1/internal/recovery-grants/invalidate-sessions', input
  ))?.ok);
}

export async function finalizePasswordRecoveryGrant(input: {
  recoveryGrant: string;
  loginName: string;
  operationKey: string;
}) {
  return Boolean((await postRecoveryOperation(
    '/v1/internal/recovery-grants/finalize', input
  ))?.ok);
}

export async function releasePasswordRecoveryGrant(input: {
  recoveryGrant: string;
  loginName: string;
  operationKey: string;
}) {
  return Boolean((await postRecoveryOperation(
    '/v1/internal/recovery-grants/release', input
  ))?.ok);
}

async function postRecoveryOperation(path: string, input: {
  recoveryGrant: string;
  loginName: string;
  operationKey: string;
}) {
  const baseUrl = process.env.CUSTOMER_BACKEND_URL?.replace(/\/+$/, '');
  if (!baseUrl) return null;
  let internalHeaders: Record<string, string>;
  try {
    internalHeaders = customerServiceHeaders();
  } catch {
    return null;
  }
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {'content-type': 'application/json', ...internalHeaders},
    body: JSON.stringify(input),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000)
  }).catch(() => null);
}

export function createPasswordRecoveryOperation(input: {
  recoveryGrant: string;
  loginName: string;
  operationKey: string;
  password: string;
}) {
  const secret = process.env.CUSTOMER_INTERNAL_API_KEY ?? '';
  if (Buffer.byteLength(secret, 'utf8') < 32) return null;
  return {
    recoveryGrant: input.recoveryGrant,
    loginName: input.loginName,
    operationKey: bindPasswordRecoveryOperation({...input, secret})
  };
}

export async function runRecoveryCognitoStep(input: {
  action: 'signOut';
  loginName: string;
} | {
  action: 'setPassword';
  loginName: string;
  password: string;
}): Promise<RecoveryFunctionOutcome> {
  const rawUrl = process.env.COGNITO_RECOVERY_FUNCTION_URL;
  if (!rawUrl) return 'definiteFailure';
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return 'definiteFailure';
  }
  if (!isRecoveryFunctionUrl(url)) return 'definiteFailure';
  let internalHeaders: Record<string, string>;
  try {
    internalHeaders = customerServiceHeaders();
  } catch {
    return 'definiteFailure';
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {'content-type': 'application/json', ...internalHeaders},
    body: JSON.stringify(input),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000)
  }).catch(() => null);
  return classifyRecoveryFunctionResponse(response?.status ?? 0);
}

export function recoveryFunctionConfigured() {
  try {
    return Buffer.byteLength(process.env.CUSTOMER_INTERNAL_API_KEY ?? '', 'utf8') >= 32
      && isRecoveryFunctionUrl(new URL(process.env.COGNITO_RECOVERY_FUNCTION_URL ?? ''));
  } catch {
    return false;
  }
}

function isRecoveryFunctionUrl(url: URL) {
  return url.protocol === 'https:'
    && url.port === ''
    && /^[a-z0-9-]+\.lambda-url\.ap-northeast-2\.on\.aws$/.test(url.hostname)
    && (url.pathname === '/' || url.pathname === '');
}
