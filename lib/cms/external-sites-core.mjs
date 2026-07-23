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
  const submitted = JSON.parse(raw);
  if (!Array.isArray(submitted)) throw new Error('External sites must be an array.');

  const ids = new Set();
  const rows = submitted.map((row) => {
    const id = typeof row?.id === 'string' ? row.id.trim() : '';
    if (!id || ids.has(id)) throw new Error('External site IDs must be unique.');
    ids.add(id);

    const hrefInput = typeof row.href === 'string' ? row.href.trim() : '';
    if (hrefInput && !isValidExternalSiteHref(hrefInput)) {
      throw new Error('External site URL must use http:// or https://.');
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
