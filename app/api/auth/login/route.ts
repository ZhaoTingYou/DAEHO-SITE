import {NextResponse, type NextRequest} from 'next/server';
import {createRemoteJWKSet, jwtVerify} from 'jose';

import {
  profileProvisioningRequest,
  sanitizeReturnTo
} from '@/lib/customer/auth-cookie-core.mjs';
import {
  authLocaleForReturnTo,
  loginErrorCode,
  normalizeLoginName
} from '@/lib/customer/auth-ui-core.mjs';
import {isSameOriginMutation} from '@/lib/customer/request-security';
import {
  clearSuccessfulLogin,
  loginRateLimitKeys,
  reserveLoginAttempt
} from '@/lib/customer/login-rate-limit';
import {
  accountsEnabled,
  authConfig,
  clearRegistrationTransactionCookie,
  customerServiceHeaders,
  readRegistrationTransaction,
  setCustomerSessionCookie
} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!(await accountsEnabled())) {
    return NextResponse.json({error: 'Customer accounts are not enabled'}, {status: 404});
  }
  const requestedReturnTo = request.nextUrl.searchParams.get('returnTo');
  const locale = authLocaleForReturnTo(requestedReturnTo);
  const destination = new URL(`/${locale}/login`, authConfig().siteUrl);
  if (requestedReturnTo) destination.searchParams.set('returnTo', sanitizeReturnTo(requestedReturnTo));
  const username = normalizeLoginName(request.nextUrl.searchParams.get('loginHint'));
  if (username) destination.searchParams.set('username', username);
  return NextResponse.redirect(destination);
}

export async function POST(request: NextRequest) {
  if (!(await accountsEnabled())) {
    return NextResponse.json({error: 'generic'}, {status: 404});
  }
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({error: 'generic'}, {status: 403});
  }
  const input = await request.json().catch(() => ({})) as {
    username?: string;
    password?: string;
    returnTo?: string;
  };
  const username = normalizeLoginName(input.username);
  const password = typeof input.password === 'string' ? input.password : '';
  if (!username) return NextResponse.json({error: 'username'}, {status: 400});
  if (!password || password.length > 256) {
    return NextResponse.json({error: 'password'}, {status: 400});
  }

  const config = authConfig();
  const rateLimitKeys = loginRateLimitKeys(request, username, config.secret);
  if (!reserveLoginAttempt(rateLimitKeys)) {
    return NextResponse.json({error: 'rateLimit'}, {status: 429, headers: {'retry-after': '900'}});
  }
  const region = process.env.COGNITO_REGION || 'ap-northeast-2';
  const cognitoResponse = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-amz-json-1.1',
      'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth'
    },
    body: JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: config.clientId,
      AuthParameters: {USERNAME: username, PASSWORD: password}
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000)
  }).catch(() => null);
  const cognitoPayload = cognitoResponse
    ? await cognitoResponse.json().catch(() => ({})) as CognitoAuthResponse
    : {};
  if (!cognitoResponse?.ok) {
    const error = loginErrorCode({type: cognitoPayload.__type, message: cognitoPayload.message});
    return NextResponse.json(
      {error},
      {status: error === 'rateLimit' ? 429 : 401}
    );
  }
  const tokens = cognitoPayload.AuthenticationResult;
  if (!tokens?.AccessToken || !tokens.IdToken || !tokens.ExpiresIn) {
    return NextResponse.json({error: 'generic'}, {status: 401});
  }

  let subject = '';
  let authTime = 0;
  let provisioning: ReturnType<typeof profileProvisioningRequest> = null;
  const registration = await readRegistrationTransaction();
  try {
    const {payload} = await jwtVerify(
      tokens.IdToken,
      createRemoteJWKSet(new URL(`${config.issuer}/.well-known/jwks.json`)),
      {issuer: config.issuer, audience: config.clientId, clockTolerance: 5}
    );
    if (payload.token_use !== 'id' || !payload.sub) throw new Error('Invalid ID token');
    subject = payload.sub;
    authTime = typeof payload.auth_time === 'number' ? payload.auth_time : 0;
    provisioning = profileProvisioningRequest(subject, payload, registration?.registrationGrant ?? '');
  } catch {
    return NextResponse.json({error: 'generic'}, {status: 401});
  }

  if (provisioning) {
    const customerBaseUrl = process.env.CUSTOMER_BACKEND_URL?.replace(/\/+$/, '');
    const profileResponse = customerBaseUrl
      ? await fetch(`${customerBaseUrl}${provisioning.path}`, {
          method: 'POST',
          headers: {'content-type': 'application/json', ...customerServiceHeaders()},
          body: JSON.stringify(provisioning.body),
          cache: 'no-store',
          signal: AbortSignal.timeout(8_000)
        }).catch(() => null)
      : null;
    if (!profileResponse?.ok) {
      return NextResponse.json({error: 'profileProvisioning'}, {status: 503});
    }
  }

  const now = Math.floor(Date.now() / 1000);
  clearSuccessfulLogin(rateLimitKeys);
  const redirectTo = sanitizeReturnTo(input.returnTo);
  const response = NextResponse.json({authenticated: true, redirectTo});
  setCustomerSessionCookie(response, {
    accessToken: tokens.AccessToken,
    refreshToken: tokens.RefreshToken,
    expiresAt: now + tokens.ExpiresIn,
    absoluteExpiresAt: now + 30 * 24 * 60 * 60,
    idleExpiresAt: now + 7 * 24 * 60 * 60,
    subject,
    authTime
  });
  if (registration) clearRegistrationTransactionCookie(response);
  return response;
}

type CognitoAuthResponse = {
  __type?: string;
  message?: string;
  AuthenticationResult?: {
    AccessToken?: string;
    IdToken?: string;
    RefreshToken?: string;
    ExpiresIn?: number;
  };
};
