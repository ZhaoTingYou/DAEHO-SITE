import type {Locale} from '@/i18n/routing';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';

export type LocaleMessages = typeof koMessages;

const messagesByLocale: Record<Locale, LocaleMessages> = {
  ko: koMessages,
  en: enMessages
};

export function getLocaleMessages(locale: Locale): LocaleMessages {
  return messagesByLocale[locale] ?? koMessages;
}
