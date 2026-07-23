export const externalSiteValidationErrorCodes = Object.freeze({
  invalidJson: 'EXTERNAL_SITES_INVALID_JSON',
  invalidShape: 'EXTERNAL_SITES_INVALID_SHAPE',
  missingId: 'EXTERNAL_SITES_MISSING_ID',
  duplicateId: 'EXTERNAL_SITES_DUPLICATE_ID',
  invalidUrl: 'EXTERNAL_SITES_INVALID_URL'
});

const validationMessageKeys = new Map(
  Object.entries(externalSiteValidationErrorCodes).map(([name, code]) => [
    code,
    `externalSites.error.${name}`
  ])
);

export class ExternalSiteValidationError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ExternalSiteValidationError';
    this.code = code;
  }
}

export function getExternalSiteValidationMessageKey(error) {
  if (
    !error ||
    typeof error !== 'object' ||
    error.name !== 'ExternalSiteValidationError' ||
    typeof error.code !== 'string'
  ) {
    return null;
  }

  return validationMessageKeys.get(error.code) ?? null;
}

export function isValidExternalSiteHref(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseExternalSitesSubmission(raw) {
  let submitted;

  try {
    submitted = JSON.parse(raw);
  } catch {
    throw new ExternalSiteValidationError(externalSiteValidationErrorCodes.invalidJson);
  }

  if (!Array.isArray(submitted)) {
    throw new ExternalSiteValidationError(externalSiteValidationErrorCodes.invalidShape);
  }

  const ids = new Set();
  const rows = submitted.map((row) => {
    const id = typeof row?.id === 'string' ? row.id.trim() : '';
    if (!id) {
      throw new ExternalSiteValidationError(externalSiteValidationErrorCodes.missingId);
    }
    if (ids.has(id)) {
      throw new ExternalSiteValidationError(externalSiteValidationErrorCodes.duplicateId);
    }
    ids.add(id);

    const hrefInput = typeof row.href === 'string' ? row.href.trim() : '';
    if (hrefInput && !isValidExternalSiteHref(hrefInput)) {
      throw new ExternalSiteValidationError(externalSiteValidationErrorCodes.invalidUrl);
    }

    const href = hrefInput ? new URL(hrefInput).toString() : '';
    const labelKo = typeof row.labelKo === 'string' ? row.labelKo.trim() : '';
    const labelEn = typeof row.labelEn === 'string' ? row.labelEn.trim() : '';
    return {id, href, enabled: row.enabled === true, labelKo, labelEn};
  });

  return {
    ko: rows.map(({id, href, enabled, labelKo, labelEn}) => ({
      id, href, enabled, label: labelKo || labelEn
    })),
    en: rows.map(({id, href, enabled, labelKo, labelEn}) => ({
      id, href, enabled, label: labelEn || labelKo
    }))
  };
}

export function mergeExternalSitesWithDefaults(defaultValue, cmsValue) {
  const defaults = isRecord(defaultValue) ? defaultValue : {};
  const cms = isRecord(cmsValue) ? cmsValue : {};
  const items = Array.isArray(cms.items)
    ? cms.items
    : Array.isArray(defaults.items)
      ? defaults.items
      : [];

  return {
    ...cloneJsonValue(defaults),
    ...cloneJsonValue(cms),
    items: cloneJsonValue(items)
  };
}

export function getVisibleExternalSites(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      id: typeof item?.id === 'string' ? item.id.trim() : '',
      label: typeof item?.label === 'string' ? item.label.trim() : '',
      href: typeof item?.href === 'string' ? item.href.trim() : '',
      enabled: item?.enabled === true
    }))
    .filter((item) => item.id && item.label && item.enabled && isValidExternalSiteHref(item.href));
}

function cloneJsonValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
