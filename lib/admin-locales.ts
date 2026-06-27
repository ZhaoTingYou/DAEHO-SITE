export const adminLocaleCookieName = 'daeho_admin_locale';
export const adminLocales = ['zh', 'ko', 'en'] as const;
export type AdminLocale = (typeof adminLocales)[number];

export const defaultAdminLocale: AdminLocale = 'zh';

export const adminLocaleLabels: Record<AdminLocale, string> = {
  zh: '中文',
  ko: '한국어',
  en: 'English'
};

export const adminLocaleLabelsByInterface: Record<AdminLocale, Record<AdminLocale, string>> = {
  zh: adminLocaleLabels,
  ko: {
    zh: '중국어',
    ko: '한국어',
    en: '영어'
  },
  en: {
    zh: 'Chinese',
    ko: 'Korean',
    en: 'English'
  }
};

export function isAdminLocale(value: string | null | undefined): value is AdminLocale {
  return Boolean(value && adminLocales.includes(value as AdminLocale));
}
