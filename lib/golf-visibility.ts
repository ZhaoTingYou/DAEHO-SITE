import type {Locale} from '@/i18n/routing';
import {isGolfEnabled} from '@/lib/golf-visibility-core';
import {getLocaleMessages} from '@/lib/locale-messages';

export {isGolfEnabled};

export async function isGolfEnabledForLocale(locale: Locale) {
  return isGolfEnabled(await getLocaleMessages(locale));
}

export async function isGolfEnabledForSite() {
  const messages = await Promise.all([
    getLocaleMessages('ko'),
    getLocaleMessages('en')
  ]);

  return messages.some((localeMessages) => isGolfEnabled(localeMessages));
}
