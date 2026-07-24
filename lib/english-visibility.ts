import {cache} from 'react';

import {isEnglishEnabled} from '@/lib/english-visibility-core';
import {getLocaleMessages} from '@/lib/locale-messages';
import {locales} from '@/lib/locales';

export {isEnglishEnabled};

export const isEnglishEnabledForSite = cache(async () => {
  const messages = await Promise.all(
    locales.map((locale) => getLocaleMessages(locale))
  );

  return messages.some((localeMessages) => isEnglishEnabled(localeMessages));
});
