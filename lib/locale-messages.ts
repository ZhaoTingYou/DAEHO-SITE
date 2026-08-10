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
import {getPublicPage, listPages} from '@/lib/cms/repositories';
import {normalizeAchievementFirstRecordsFallback} from '@/lib/achievement-first-records-core';
import {preserveCollectionCategoryFilters} from '@/lib/collection-category-filters-core';
import {isNextDynamicServerError} from '@/lib/next-dynamic-error';
import {isTechniquePageVisible} from '@/lib/public-page-visibility';
import {normalizeTechniquePageVisibility} from '@/lib/public-page-visibility-core';
import {mergeExternalSitesWithDefaults} from '@/lib/cms/external-sites-core.mjs';
import {isStaticCmsPreviewEnabled} from '@/lib/cms/static-snapshot';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';

export type LocaleMessages = typeof koMessages;

const messagesByLocale: Record<Locale, LocaleMessages> = {
  ko: koMessages,
  en: enMessages
};

export async function getLocaleMessages(locale: Locale): Promise<LocaleMessages> {
  return buildLocaleMessages(locale, await readCmsPages());
}

export async function getPublicLocaleMessages(
  locale: Locale,
  pageKeys: readonly string[]
): Promise<LocaleMessages> {
  return buildLocaleMessages(locale, await readPublicCmsPages(locale, pageKeys));
}

async function buildLocaleMessages(locale: Locale, pages: CmsPageOverride[]): Promise<LocaleMessages> {
  const staticMessages = messagesByLocale[locale] ?? koMessages;
  const baseMessages = cloneJson(staticMessages);

  const messages = normalizeMasteryNavigationCopy(
    applyCmsPageOverrides(baseMessages, locale, pages),
    staticMessages
  );
  messages.specialtyPages.collection.gallery.filters = preserveCollectionCategoryFilters(
    messages.specialtyPages.collection.gallery.filters,
    staticMessages.specialtyPages.collection.gallery.filters
  );
  normalizeAchievementFirstRecordsFallback(messages, staticMessages);

  return normalizePublicPageVisibility(messages);
}

export function normalizePublicPageVisibility(messages: LocaleMessages): LocaleMessages {
  return normalizeTechniquePageVisibility(messages, isTechniquePageVisible);
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

function applyCmsPageOverrides(messages: LocaleMessages, locale: Locale, pages: CmsPageOverride[]) {
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

        if (page.pageKey === 'common' && group.key === 'main') {
          const externalSitesPath = 'footer.externalSites';
          const externalSites = mergeExternalSitesWithDefaults(
            getObjectValueAtPath(currentValue, externalSitesPath),
            getObjectValueAtPath(override, externalSitesPath)
          );
          setObjectValueAtPath(
            nextValue as Record<string, unknown>,
            externalSitesPath,
            externalSites
          );
        }

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

async function readPublicCmsPages(locale: Locale, pageKeys: readonly string[]): Promise<CmsPageOverride[]> {
  const uniquePageKeys = [...new Set(pageKeys.map((pageKey) => pageKey.trim()).filter(Boolean))];
  const pages = await Promise.all(uniquePageKeys.map(async (pageKey) => {
    try {
      const page = await getPublicPage(pageKey, locale);

      if (!page) {
        if (!isStaticCmsPreviewEnabled()) {
          throw new Error(`Public CMS page ${pageKey} was not found.`);
        }
        return null;
      }

      return {
        pageKey,
        content: {
          [locale]: page.content
        }
      } satisfies CmsPageOverride;
    } catch (error) {
      if (!isStaticCmsPreviewEnabled()) {
        throw error;
      }
      if (!isNextDynamicServerError(error)) {
        console.error(`[cms] Falling back to static locale messages because public CMS page ${pageKey} could not be read.`, error);
      }
      return null;
    }
  }));

  return pages.filter((page): page is CmsPageOverride => page !== null);
}

type CmsPageOverride = {
  pageKey: string;
  content: Partial<Record<Locale, unknown>>;
};
