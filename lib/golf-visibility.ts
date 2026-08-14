import type {Locale} from '@/i18n/routing';
import {isGolfEnabled} from '@/lib/golf-visibility-core';
import {getPublicLocaleMessages} from '@/lib/locale-messages';

export {isGolfEnabled};

export async function isGolfEnabledForLocale(locale: Locale) {
  return isGolfEnabled(await getPublicLocaleMessages(locale, ['common']));
}

export async function isGolfEnabledForSite() {
  const messages = await Promise.all([
    getPublicLocaleMessages('ko', ['common']),
    getPublicLocaleMessages('en', ['common'])
  ]);

  return messages.some((localeMessages) => isGolfEnabled(localeMessages));
}
