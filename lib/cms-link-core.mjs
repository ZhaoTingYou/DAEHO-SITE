const allowedAbsoluteSchemes = /^(https?:|mailto:|tel:|sms:)/i;
const unsafeSchemes = /^(javascript:|data:|vbscript:)/i;
const localizedPath = /^\/(?:ko|en)(?:\/|$|\?|#)/;

export function resolveCmsHref(locale, value, fallback = '/', parameters = {}) {
  const fallbackValue = normalizeValue(fallback) || '/';
  const requestedValue = normalizeValue(value);
  const safeValue = isUnsafeValue(requestedValue) ? fallbackValue : requestedValue || fallbackValue;
  const resolvedValue = applyParameters(safeValue, parameters);

  if (
    allowedAbsoluteSchemes.test(resolvedValue) ||
    resolvedValue.startsWith('//') ||
    resolvedValue.startsWith('#') ||
    resolvedValue.startsWith('?') ||
    localizedPath.test(resolvedValue)
  ) {
    return resolvedValue;
  }

  const normalizedPath = resolvedValue.startsWith('/') ? resolvedValue : `/${resolvedValue}`;
  return `/${locale}${normalizedPath === '/' ? '' : normalizedPath}`;
}

export function appendCmsQuery(href, values) {
  const entries = Object.entries(values).filter(([, value]) => value !== undefined && value !== null);

  if (entries.length === 0) {
    return href;
  }

  const hashIndex = href.indexOf('#');
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const separator = base.includes('?') ? '&' : '?';
  const query = new URLSearchParams(
    entries.map(([key, value]) => [key, String(value)])
  ).toString();

  return `${base}${separator}${query}${hash}`;
}

function applyParameters(value, parameters) {
  return value.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) => {
    if (!(key in parameters)) {
      return match;
    }

    return encodeURIComponent(String(parameters[key]));
  });
}

function isUnsafeValue(value) {
  return unsafeSchemes.test(value);
}

function normalizeValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}
