export const adminLocaleCookieName = 'deaho_admin_locale';
export const adminLocales = ['zh', 'ko', 'en'] as const;
export type AdminLocale = (typeof adminLocales)[number];

export const defaultAdminLocale: AdminLocale = 'zh';

export const adminLocaleLabels: Record<AdminLocale, string> = {
  zh: '中文',
  ko: '한국어',
  en: 'English'
};

export function isAdminLocale(value: string | null | undefined): value is AdminLocale {
  return Boolean(value && adminLocales.includes(value as AdminLocale));
}
