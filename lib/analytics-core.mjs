export const ANALYTICS_CONSENT_COOKIE = 'daeho_analytics_consent';
export const ANALYTICS_CONSENT_EVENT = 'daeho:analytics-consent-open';

const CONSENT_VERSION = 'v1';
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const ATTRIBUTION_PARAMETERS = new Set([
  'utm_id',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_source_platform',
  'utm_term',
  'utm_content',
  'gclid',
  'dclid'
]);
const EVENT_PARAMETERS = {
  generate_lead: new Set(['form_type', 'locale', 'page_path']),
  contact_cta_click: new Set(['cta_location', 'destination', 'locale', 'page_path']),
  golf_inquiry_cta_click: new Set(['cta_location', 'destination', 'locale', 'page_path']),
  phone_click: new Set(['cta_location', 'destination', 'locale', 'page_path']),
  email_click: new Set(['cta_location', 'destination', 'locale', 'page_path']),
  social_outbound_click: new Set(['cta_location', 'destination', 'platform', 'locale', 'page_path'])
};
const SOCIAL_HOSTS = [
  {platform: 'instagram', hosts: ['instagram.com']},
  {platform: 'youtube', hosts: ['youtube.com', 'youtu.be']},
  {platform: 'facebook', hosts: ['facebook.com', 'fb.com']},
  {platform: 'kakao', hosts: ['kakao.com', 'kakao.co.kr']},
  {platform: 'x', hosts: ['x.com', 'twitter.com']},
  {platform: 'naver_blog', hosts: ['blog.naver.com']}
];

export function sanitizeAnalyticsUrl(input) {
  const url = new URL(input, 'https://daeho.works');
  const search = new URLSearchParams();

  for (const [key, value] of url.searchParams) {
    if (ATTRIBUTION_PARAMETERS.has(key)) {
      search.append(key, value);
    }
  }

  const query = search.toString();
  const pagePath = `${url.pathname}${query ? `?${query}` : ''}`;

  return {
    pagePath,
    pageLocation: `${url.origin}${pagePath}`
  };
}

export function parseAnalyticsConsent(cookieHeader) {
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ANALYTICS_CONSENT_COOKIE}=`));

  if (!cookie) {
    return 'unknown';
  }

  const value = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1));
  if (value === `${CONSENT_VERSION}:granted`) {
    return 'granted';
  }
  if (value === `${CONSENT_VERSION}:denied`) {
    return 'denied';
  }
  return 'unknown';
}

export function serializeAnalyticsConsent(choice, secure) {
  const value = encodeURIComponent(`${CONSENT_VERSION}:${choice}`);
  const attributes = [
    `${ANALYTICS_CONSENT_COOKIE}=${value}`,
    'Path=/',
    `Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
    'SameSite=Lax'
  ];

  if (secure) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}

export function sanitizeAnalyticsEvent(name, inputParameters = {}) {
  const allowlist = EVENT_PARAMETERS[name];
  if (!allowlist) {
    return null;
  }

  const parameters = {};
  for (const key of allowlist) {
    const value = sanitizeParameter(key, inputParameters[key]);
    if (value !== null) {
      parameters[key] = value;
    }
  }

  return {name, parameters};
}

export function classifyAnalyticsLink(href, currentOrigin) {
  if (!href) {
    return null;
  }

  if (href.startsWith('tel:')) {
    return {name: 'phone_click', destination: 'tel'};
  }
  if (href.startsWith('mailto:')) {
    return {name: 'email_click', destination: 'email'};
  }

  let url;
  try {
    url = new URL(href, currentOrigin);
  } catch {
    return null;
  }

  const social = SOCIAL_HOSTS.find(({hosts}) => hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)));
  if (social) {
    return {
      name: 'social_outbound_click',
      destination: url.hostname.replace(/^www\./, ''),
      platform: social.platform
    };
  }

  if (url.origin !== currentOrigin) {
    return null;
  }

  if (/\/(?:ko|en)\/contact\/?$/.test(url.pathname)) {
    return {name: 'contact_cta_click', destination: url.pathname};
  }
  if (/\/(?:ko|en)\/golf\/inquiry\/?$/.test(url.pathname)) {
    return {name: 'golf_inquiry_cta_click', destination: url.pathname};
  }

  return null;
}

function sanitizeParameter(key, value) {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  if (key === 'locale') {
    return value === 'ko' || value === 'en' ? value : null;
  }
  if (key === 'form_type') {
    return value === 'contact' || value === 'golf' ? value : null;
  }
  if (key === 'page_path') {
    return sanitizeAnalyticsUrl(new URL(value, 'https://daeho.works')).pagePath;
  }

  return value.slice(0, 200);
}
