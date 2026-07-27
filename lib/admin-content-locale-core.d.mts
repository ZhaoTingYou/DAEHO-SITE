export type AdminContentLocale = "ko" | "en";

export const ADMIN_CONTENT_LOCALE_STORAGE_KEY: string;

export function normalizeAdminContentLocale(
  value: unknown,
): AdminContentLocale;

export function contentLocaleForKey(
  currentLocale: AdminContentLocale,
  key: string,
): AdminContentLocale | null;
