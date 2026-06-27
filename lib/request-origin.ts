import type {NextRequest} from 'next/server';

function firstHeaderValue(value: string | null) {
  return value?.split(',')[0]?.trim() || null;
}

export function getExternalOrigin(request: NextRequest) {
  const host =
    firstHeaderValue(request.headers.get('x-forwarded-host')) ??
    firstHeaderValue(request.headers.get('host')) ??
    request.nextUrl.host;
  const protocol =
    firstHeaderValue(request.headers.get('x-forwarded-proto')) ??
    request.nextUrl.protocol.replace(/:$/, '') ??
    'http';

  return `${protocol}://${host}`;
}

export function getExternalUrl(request: NextRequest, pathname: string) {
  return new URL(pathname, getExternalOrigin(request));
}
