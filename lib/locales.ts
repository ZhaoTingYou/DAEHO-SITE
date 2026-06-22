export const locales = ['ko', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ko';

export const localeShortLabels: Record<Locale, string> = {
  ko: 'KO',
  en: 'EN'
};

export const localeFieldSuffixes: Record<Locale, string> = {
  ko: 'Ko',
  en: 'En'
};

export function isLocale(value: string | undefined): value is Locale {
  return Boolean(value && locales.includes(value as Locale));
}
