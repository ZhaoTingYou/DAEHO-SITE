import {NextResponse, type NextRequest} from 'next/server';

import {authConfig, clearCustomerSessionCookie, readCustomerSession} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'ko';
  const config = authConfig();
  const session = await readCustomerSession();
  if (session?.refreshToken) {
    const region = process.env.COGNITO_REGION || 'ap-northeast-2';
    await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-amz-json-1.1',
        'x-amz-target': 'AWSCognitoIdentityProviderService.RevokeToken'
      },
      body: JSON.stringify({ClientId: config.clientId, Token: session.refreshToken}),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000)
    }).catch(() => null);
  }
  const response = NextResponse.redirect(new URL(`/${locale}`, config.siteUrl));
  clearCustomerSessionCookie(response);
  return response;
}
