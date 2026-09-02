import {NextResponse, type NextRequest} from 'next/server';

import {isSameOriginMutation} from '@/lib/customer/request-security';
import {
  clearCustomerSessionCookie,
  customerApiRequest,
  refreshedCustomerSession,
  setCustomerSessionCookie
} from '@/lib/customer/server';
import type {CustomerProfile} from '@/lib/customer/types';

export const runtime = 'nodejs';

export async function GET() {
  return handle('GET');
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({error: 'Invalid request origin'}, {status: 403});
  }
  return handle('PATCH', await request.text());
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({error: 'Invalid request origin'}, {status: 403});
  }
  const session = await refreshedCustomerSession();
  if (!session) {
    return NextResponse.json({error: 'Authentication required'}, {status: 401});
  }
  const now = Math.floor(Date.now() / 1000);
  if (!session.authTime || session.authTime < now - 5 * 60) {
    return NextResponse.json({error: 'Recent authentication is required'}, {status: 428});
  }
  try {
    const profile = await customerApiRequest<CustomerProfile>('/v1/me', session, {method: 'DELETE'});
    let cognitoDeleted = session.accessToken === 'dev';
    if (!cognitoDeleted) {
      const region = process.env.COGNITO_REGION || 'ap-northeast-2';
      const result = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-amz-json-1.1',
          'x-amz-target': 'AWSCognitoIdentityProviderService.DeleteUser'
        },
        body: JSON.stringify({AccessToken: session.accessToken}),
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000)
      }).catch(() => null);
      cognitoDeleted = Boolean(result?.ok);
    }
    const response = NextResponse.json({profile, cognitoDeleted}, {status: cognitoDeleted ? 200 : 202});
    clearCustomerSessionCookie(response);
    return response;
  } catch (error) {
    const status = (error as {status?: number}).status ?? 502;
    return NextResponse.json({error: 'Account deletion request failed'}, {status});
  }
}

async function handle(method: string, body?: string) {
  const session = await refreshedCustomerSession();
  if (!session) {
    return NextResponse.json({error: 'Authentication required'}, {status: 401});
  }
  try {
    const profile = await customerApiRequest<CustomerProfile>('/v1/me', session, {method, body});
    const response = NextResponse.json(profile);
    setCustomerSessionCookie(response, session);
    return response;
  } catch (error) {
    const status = (error as {status?: number}).status ?? 502;
    const response = NextResponse.json({error: 'Customer profile request failed'}, {status});
    if (status === 401) {
      clearCustomerSessionCookie(response);
    }
    return response;
  }
}
