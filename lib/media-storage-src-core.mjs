export const DEFAULT_MEDIA_STORAGE_BASE_URL =
  'https://daeho-prod-media.s3.ap-northeast-2.amazonaws.com';

export const MEDIA_STORAGE_BASE_URL = normalizeStorageBaseUrl(
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL
);

export function storageImageSrc(value) {
  const trimmed = value?.trim() ?? '';

  if (!trimmed || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const storageKey = stripPrefix(trimmed, [
    '/images/',
    'images/',
    '/uploads/',
    'uploads/'
  ]);

  if (storageKey !== null) {
    return storageUrl(storageKey);
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return storageUrl(trimmed);
}

export function storageVideoSrc(value) {
  const trimmed = value?.trim() ?? '';

  if (!trimmed || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const storageKey = stripPrefix(trimmed, [
    '/videos/',
    'videos/',
    '/video/',
    'video/'
  ]);

  if (storageKey !== null) {
    return storageUrl(`videos/${storageKey}`);
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return storageUrl(`videos/${trimmed}`);
}

function stripPrefix(value, prefixes) {
  const prefix = prefixes.find((candidate) => value.startsWith(candidate));
  return prefix ? value.slice(prefix.length) : null;
}

function storageUrl(key) {
  return `${MEDIA_STORAGE_BASE_URL}/${key.replace(/^\/+/, '')}`;
}

function normalizeStorageBaseUrl(value) {
  const trimmed = value?.trim().replace(/\/+$/, '') ?? '';

  if (!/^https?:\/\//i.test(trimmed)) {
    return DEFAULT_MEDIA_STORAGE_BASE_URL;
  }

  try {
    return new URL(trimmed).toString().replace(/\/+$/, '');
  } catch {
    return DEFAULT_MEDIA_STORAGE_BASE_URL;
  }
}
