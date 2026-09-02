import {NextResponse, type NextRequest} from 'next/server';

import {isSameOriginMutation} from '@/lib/customer/request-security';
import {
  clearCustomerSessionCookie,
  customerApiRequest,
  refreshedCustomerSession
} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({error: 'Invalid request origin'}, {status: 403});
  }
  const session = await refreshedCustomerSession();
  if (!session) {
    return NextResponse.json({error: 'Authentication required'}, {status: 401});
  }
  try {
    await customerApiRequest('/v1/me/logout-all', session, {method: 'POST'});
    if (session.accessToken !== 'dev') {
      const region = process.env.COGNITO_REGION || 'ap-northeast-2';
      const globalSignOut = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-amz-json-1.1',
          'x-amz-target': 'AWSCognitoIdentityProviderService.GlobalSignOut'
        },
        body: JSON.stringify({AccessToken: session.accessToken}),
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000)
      });
      if (!globalSignOut.ok) {
        throw new Error('Cognito global sign-out failed');
      }
    }
  } catch {
    const response = NextResponse.json({
      signedOut: true,
      warning: 'The local session was cleared, but global revocation needs administrator verification.'
    }, {status: 502});
    clearCustomerSessionCookie(response);
    return response;
  }
  const response = NextResponse.json({signedOut: true});
  clearCustomerSessionCookie(response);
  return response;
}
