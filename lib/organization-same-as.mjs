const socialHosts = new Set([
  'blog.naver.com',
  'business.kakao.com',
  'facebook.com',
  'instagram.com',
  'kakao.com',
  'pf.kakao.com',
  'twitter.com',
  'x.com',
  'youtube.com'
]);

export function getOrganizationSameAs(footer) {
  if (!isRecord(footer)) return [];

  const socialLinks = isRecord(footer.socialLinks)
    ? Object.values(footer.socialLinks).filter(isConfiguredSocialProfile)
    : [];
  const externalItems = isRecord(footer.externalSites) && Array.isArray(footer.externalSites.items)
    ? footer.externalSites.items
        .filter((item) => item?.enabled === true)
        .map((item) => normalizeHttpUrl(item?.href))
        .filter(Boolean)
    : [];

  return [...new Set([...socialLinks, ...externalItems])];
}

function isConfiguredSocialProfile(value) {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return false;

  const url = new URL(normalized);
  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');

  if (!socialHosts.has(hostname)) return true;

  return url.pathname !== '/' || Boolean(url.search);
}

function normalizeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';

  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
