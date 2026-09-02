import {NextResponse, type NextRequest} from 'next/server';

import {authConfig, clearCustomerSessionCookie} from '@/lib/customer/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'ko';
  const config = authConfig();
  const url = new URL(`${config.domain}/logout`);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: `${config.siteUrl}/${locale}`
  }).toString();
  const response = NextResponse.redirect(url);
  clearCustomerSessionCookie(response);
  return response;
}
