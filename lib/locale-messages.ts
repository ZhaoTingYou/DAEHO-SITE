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
  const staticMessages = messagesByLocale[locale] ?? koMessages;
  const baseMessages = cloneJson(staticMessages);

  return normalizeMasteryNavigationCopy(await applyCmsPageOverrides(baseMessages, locale), staticMessages);
}

export function normalizeMasteryNavigationCopy(messages: LocaleMessages, staticMessages: LocaleMessages): LocaleMessages {
  const items = messages.common.navigation.items;
  const staticItems = staticMessages.common.navigation.items;
  const descriptions = messages.common.navigation.mega.specialty.descriptions;
  const staticDescriptions = staticMessages.common.navigation.mega.specialty.descriptions;

  if (!items.making) {
    items.making = staticItems.making;
  }

  if (!items.technique || items.technique === items.making) {
    items.technique = staticItems.technique;
  }

  if (!descriptions.making) {
    descriptions.making = staticDescriptions.making;
  }

  if (
    !descriptions.technique ||
    descriptions.technique === descriptions.making ||
    descriptions.technique === 'Technique · Seven careful stages'
  ) {
    descriptions.technique = staticDescriptions.technique;
  }

  return messages;
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
