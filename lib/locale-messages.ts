import type {Locale} from '@/i18n/routing';
import {
  cloneJson,
  getPageContentGroupOverride,
  getPageContentGroups,
  deepMergeJson,
  getObjectValueAtPath,
  managedPageDefinitions,
  setObjectValueAtPath
} from '@/lib/cms/page-catalog';
import {listPages} from '@/lib/cms/repositories';
import {isNextDynamicServerError} from '@/lib/next-dynamic-error';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';

export type LocaleMessages = typeof koMessages;

const messagesByLocale: Record<Locale, LocaleMessages> = {
  ko: koMessages,
  en: enMessages
};

export async function getLocaleMessages(locale: Locale): Promise<LocaleMessages> {
  const baseMessages = cloneJson(messagesByLocale[locale] ?? koMessages);

  return applyCmsPageOverrides(baseMessages, locale);
}

async function applyCmsPageOverrides(messages: LocaleMessages, locale: Locale) {
  const pages = await readCmsPages();

  if (pages.length === 0) {
    return messages;
  }

  const managedDefinitionsByKey = new Map(managedPageDefinitions.map((page) => [page.pageKey, page]));

  for (const page of pages) {
    const definition = managedDefinitionsByKey.get(page.pageKey);

    if (definition?.contentGroups?.length) {
      for (const group of getPageContentGroups(definition)) {
        const override = getPageContentGroupOverride(page.content[locale], group.key);
        const currentValue = getObjectValueAtPath(messages, group.sourcePath);
        const nextValue = deepMergeJson(currentValue ?? {}, override);

        setObjectValueAtPath(messages as unknown as Record<string, unknown>, group.sourcePath, nextValue);
      }

      continue;
    }

    const sourcePath = definition?.sourcePath ?? page.pageKey;
    const currentValue = getObjectValueAtPath(messages, sourcePath);
    const nextValue = deepMergeJson(currentValue ?? {}, page.content[locale]);

    setObjectValueAtPath(messages as unknown as Record<string, unknown>, sourcePath, nextValue);
  }

  return messages;
}

async function readCmsPages() {
  try {
    return await listPages();
  } catch (error) {
    if (!isNextDynamicServerError(error)) {
      console.error('[cms] Falling back to static locale messages because CMS pages could not be read.', error);
    }
    return [];
  }
}
