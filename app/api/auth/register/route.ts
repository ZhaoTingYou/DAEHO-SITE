import {NextResponse, type NextRequest} from 'next/server';

import {isSameOriginMutation} from '@/lib/customer/request-security';
import {accountsEnabled, authConfig, customerServiceHeaders} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!accountsEnabled() || !isSameOriginMutation(request)) {
    return NextResponse.json({error: 'Registration is unavailable'}, {status: 403});
  }
  const input = await request.json() as {phone?: string; password?: string; registrationGrant?: string};
  const phone = normalizePhone(input.phone);
  if (!phone || !input.password || input.password.length < 8 || !input.registrationGrant) {
    return NextResponse.json({error: 'Verified phone, password and registration grant are required'}, {status: 400});
  }
  const config = authConfig();
  const region = process.env.COGNITO_REGION || 'ap-northeast-2';
  const signupResponse = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-amz-json-1.1',
      'x-amz-target': 'AWSCognitoIdentityProviderService.SignUp'
    },
    body: JSON.stringify({
      ClientId: config.clientId,
      Username: phone,
      Password: input.password,
      UserAttributes: [{Name: 'phone_number', Value: phone}],
      ClientMetadata: {registrationGrant: input.registrationGrant}
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000)
  }).catch(() => null);
  if (!signupResponse) {
    return NextResponse.json({error: 'Cognito registration is unavailable'}, {status: 503});
  }
  const signupPayload = await signupResponse.json() as {UserSub?: string; message?: string; __type?: string};
  if (!signupResponse.ok || !signupPayload.UserSub) {
    return NextResponse.json({
      error: signupPayload.__type?.split('#').at(-1) ?? 'RegistrationFailed',
      message: signupPayload.message ?? 'Unable to create account'
    }, {status: signupResponse.status >= 500 ? 503 : 400});
  }
  const customerBaseUrl = process.env.CUSTOMER_BACKEND_URL?.replace(/\/+$/, '');
  if (!customerBaseUrl) {
    return NextResponse.json({error: 'Customer profile service is unavailable'}, {status: 503});
  }
  const profileResponse = await fetch(`${customerBaseUrl}/v1/internal/profiles`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...customerServiceHeaders()
    },
    body: JSON.stringify({
      subject: signupPayload.UserSub,
      registrationGrant: input.registrationGrant
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000)
  }).catch(() => null);
  if (!profileResponse?.ok) {
    return NextResponse.json({
      error: 'ProfileProvisioningFailed',
      message: 'The login was created but the customer profile needs administrator recovery.'
    }, {status: 502});
  }
  return NextResponse.json({created: true, loginUrl: '/api/auth/login'});
}

function normalizePhone(input: string | undefined) {
  const value = String(input ?? '').replace(/[^0-9+]/g, '');
  if (value.startsWith('010')) {
    return `+82${value.slice(1)}`;
  }
  return value.startsWith('+82') ? value : '';
}
