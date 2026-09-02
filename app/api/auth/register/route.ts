import {NextResponse, type NextRequest} from 'next/server';

import {isSameOriginMutation} from '@/lib/customer/request-security';
import {
  accountsEnabled,
  authConfig,
  setRegistrationTransactionCookie
} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!(await accountsEnabled()) || !isSameOriginMutation(request)) {
    return NextResponse.json({error: 'Registration is unavailable'}, {status: 403});
  }
  const input = await request.json() as {registrationGrant?: string};
  if (!input.registrationGrant || input.registrationGrant.length < 32) {
    return NextResponse.json({error: 'Registration grant is required'}, {status: 400});
  }
  const config = authConfig();
  const region = process.env.COGNITO_REGION || 'ap-northeast-2';
  const response = NextResponse.json({
    prepared: true,
    cognitoEndpoint: `https://cognito-idp.${region}.amazonaws.com/`,
    clientId: config.clientId,
    loginUrl: '/api/auth/login'
  });
  setRegistrationTransactionCookie(response, input.registrationGrant);
  return response;
}
