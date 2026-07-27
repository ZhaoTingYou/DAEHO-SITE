export const ADMIN_CONTENT_LOCALE_STORAGE_KEY = "daeho-admin-content-locale";

export function normalizeAdminContentLocale(value) {
  return value === "en" ? "en" : "ko";
}

export function contentLocaleForKey(currentLocale, key) {
  const locale = normalizeAdminContentLocale(currentLocale);

  if (key === "Home") {
    return "ko";
  }

  if (key === "End") {
    return "en";
  }

  if (key === "ArrowLeft" || key === "ArrowRight") {
    return locale === "ko" ? "en" : "ko";
  }

  return null;
}
