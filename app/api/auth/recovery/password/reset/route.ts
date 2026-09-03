import {NextResponse, type NextRequest} from 'next/server';

import {normalizeLoginName, passwordPolicyIssues} from '@/lib/customer/auth-ui-core.mjs';
import {isSameOriginMutation} from '@/lib/customer/request-security';
import {
  finalizePasswordRecoveryGrant,
  createPasswordRecoveryOperation,
  invalidatePasswordRecoverySessions,
  recoveryFunctionConfigured,
  releasePasswordRecoveryGrant,
  reservePasswordRecoveryGrant,
  runRecoveryCognitoStep
} from '@/lib/customer/recovery-server';
import {accountsEnabled} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!(await accountsEnabled())) {
    return NextResponse.json({error: 'unavailable'}, {status: 404});
  }
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({error: 'invalidOrigin'}, {status: 403});
  }
  const input = await request.json().catch(() => ({})) as {
    recoveryGrant?: string;
    loginName?: string;
    password?: string;
    operationKey?: string;
  };
  const recoveryGrant = typeof input.recoveryGrant === 'string' ? input.recoveryGrant : '';
  const loginName = normalizeLoginName(input.loginName);
  const password = typeof input.password === 'string' ? input.password : '';
  const operationKey = typeof input.operationKey === 'string' ? input.operationKey : '';
  if (!loginName || !recoveryGrant || recoveryGrant.length > 256
      || operationKey.length < 16 || operationKey.length > 200) {
    return NextResponse.json({error: 'invalidRecovery'}, {status: 400});
  }
  if (password.length > 256 || passwordPolicyIssues(password).length > 0) {
    return NextResponse.json({error: 'invalidPassword'}, {status: 400});
  }
  if (!recoveryFunctionConfigured()) {
    return NextResponse.json({error: 'unavailable'}, {status: 503});
  }
  const operation = createPasswordRecoveryOperation({
    recoveryGrant, loginName, operationKey, password
  });
  if (!operation) {
    return NextResponse.json({error: 'unavailable'}, {status: 503});
  }
  const reservation = await reservePasswordRecoveryGrant(operation);
  if (!reservation) {
    return NextResponse.json({error: 'invalidRecovery'}, {status: 400});
  }
  if (reservation.state === 'completed') {
    return NextResponse.json({reset: true});
  }
  if (reservation.state === 'in_progress') {
    return NextResponse.json({error: 'inProgress'}, {status: 409});
  }
  if (reservation.stage === 'reserved') {
    const signOut = await runRecoveryCognitoStep({action: 'signOut', loginName});
    if (signOut !== 'success') {
      if (signOut === 'definiteFailure') await releasePasswordRecoveryGrant(operation);
      return NextResponse.json({error: 'unavailable'}, {status: 503});
    }
    if (!await invalidatePasswordRecoverySessions(operation)) {
      return NextResponse.json({error: 'unavailable'}, {status: 503});
    }
  }
  const passwordUpdate = await runRecoveryCognitoStep({
    action: 'setPassword', loginName, password
  });
  if (passwordUpdate !== 'success') {
    return NextResponse.json({error: 'unavailable'}, {status: 503});
  }
  if (!await finalizePasswordRecoveryGrant(operation)) {
    return NextResponse.json({error: 'unavailable'}, {status: 503});
  }
  return NextResponse.json({reset: true});
}
