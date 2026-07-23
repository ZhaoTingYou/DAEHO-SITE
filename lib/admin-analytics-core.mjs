export const MAX_ANALYTICS_PAGE = 1_000_000;

const analyticsChannels = new Set([
  'google',
  'naver',
  'instagram',
  'kakao',
  'qr',
  'social',
  'referral',
  'direct',
  'other'
]);

export function normalizeAnalyticsFilters(query, today) {
  const defaultFrom = addDays(today, -29);
  const parsedFrom = normalizeDate(firstValue(query?.from));
  const parsedTo = normalizeDate(firstValue(query?.to));
  const from = parsedFrom ?? defaultFrom;
  const to = parsedTo ?? today;
  const validOrder = from <= to;

  return {
    from: validOrder ? from : defaultFrom,
    to: validOrder ? to : today,
    channel: normalizeChannel(firstValue(query?.channel)),
    page: boundedPositiveInteger(firstValue(query?.page)) ?? 1,
    pageSize: 25
  };
}

export function analyticsHref(filters, updates = {}) {
  const next = {...filters, ...updates};
  const params = new URLSearchParams({from: next.from, to: next.to});

  if (next.channel) {
    params.set('channel', next.channel);
  }
  if (next.page > 1) {
    params.set('page', String(next.page));
  }

  return `/admin/analytics?${params.toString()}`;
}

export function analyticsPageCorrectionHref(filters, totalPages) {
  const lastPage = Math.max(1, Math.min(MAX_ANALYTICS_PAGE, totalPages));
  return filters.page > lastPage ? analyticsHref(filters, {page: lastPage}) : null;
}

export function isAnalyticsPresetActive(filters, today, days) {
  return filters.to === today && filters.from === addDays(today, -(days - 1));
}

export function nowInSeoul(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function addDays(date, days) {
  const next = new Date(`${date}T12:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function formatNumber(value, locale) {
  return new Intl.NumberFormat(numberLocale(locale)).format(value);
}

export function formatDecimal(value, locale) {
  return new Intl.NumberFormat(numberLocale(locale), {maximumFractionDigits: 2}).format(value);
}

export function formatPercent(value, locale) {
  return new Intl.NumberFormat(numberLocale(locale), {style: 'percent', maximumFractionDigits: 1}).format(value);
}

export function formatDate(value, locale) {
  return new Intl.DateTimeFormat(numberLocale(locale), {
    dateStyle: 'medium',
    timeZone: 'Asia/Seoul'
  }).format(new Date(`${value}T00:00:00+09:00`));
}

export function formatDateTime(value, locale) {
  return new Intl.DateTimeFormat(numberLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul'
  }).format(new Date(value));
}

function normalizeDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? undefined
    : value;
}

function normalizeChannel(value) {
  const channel = value?.trim().toLowerCase();
  return channel && analyticsChannels.has(channel) ? channel : undefined;
}

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function boundedPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= MAX_ANALYTICS_PAGE
    ? parsed
    : undefined;
}

function numberLocale(locale) {
  return locale === 'zh' ? 'zh-CN' : locale === 'ko' ? 'ko-KR' : 'en-US';
}
