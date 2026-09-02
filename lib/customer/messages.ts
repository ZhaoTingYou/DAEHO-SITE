import type {Locale} from '@/i18n/routing';
import {getPublicLocaleMessages, type LocaleMessages} from '@/lib/locale-messages';

export type AccountMessages = LocaleMessages['account'];

export async function getAccountMessages(locale: Locale): Promise<AccountMessages> {
  return (await getPublicLocaleMessages(locale, [])).account;
}
