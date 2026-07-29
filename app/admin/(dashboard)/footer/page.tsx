import Link from 'next/link';
import {notFound} from 'next/navigation';

import {savePageAction} from '@/app/admin/actions';
import {getAdminI18n, getContentLocaleLabel} from '@/lib/admin-i18n';
import type {AdminLocale} from '@/lib/admin-locales';
import {
  cloneJson,
  deepMergeJson,
  getManagedPageDefinition,
  getObjectValueAtPath,
  getPageContentGroupOverride,
  getPageContentGroups,
  type PageDefinition,
  type PageFieldDefinition
} from '@/lib/cms/page-catalog';
import {getLocalizedPageFieldLabel} from '@/lib/cms/page-catalog-i18n';
import {getPage} from '@/lib/cms/repositories';
import {getLocaleMessages} from '@/lib/locale-messages';
import {localeFieldSuffixes, locales, type Locale} from '@/lib/locales';

import {AdminActionAlert} from '../../_components/admin-feedback';
import {CheckboxField, SubmitButton, TextAreaField, TextField} from '../../_components/admin-fields';
import {ExternalSitesEditor} from '../../_components/external-sites-editor';
import {PageHeader, Panel} from '../../_components/admin-shell';
import type {ExternalSiteItem} from '@/lib/cms/external-sites-core.mjs';

type FooterLocaleData = {
  locale: Locale;
  groups: Array<{
    key: string;
    content: Record<string, unknown>;
  }>;
  seo: Record<string, unknown>;
};

type FooterFieldSection = {
  titleKey: string;
  paths: string[];
};

const commonPageKey = 'common';
const mainGroupKey = 'main';
const footerReturnPath = '/admin/footer';

const footerFieldSections: FooterFieldSection[] = [
  {
    titleKey: 'footer.sectionVisibility',
    paths: [
      'features.golfEnabled'
    ]
  },
  {
    titleKey: 'footer.sectionBrand',
    paths: [
      'footer.tagline',
      'footer.navigation',
      'footer.locale',
      'footer.otherSites',
      'footer.golfInquiry'
    ]
  },
  {
    titleKey: 'footer.sectionLegal',
    paths: [
      'footer.legal.heading',
      'footer.legal.terms',
      'footer.legal.privacy',
      'navigation.hrefs.terms',
      'navigation.hrefs.privacy',
      'footer.legal.rights'
    ]
  },
  {
    titleKey: 'footer.sectionBusiness',
    paths: [
      'footer.business.heading',
      'footer.business.items.0.label',
      'footer.business.items.0.value',
      'footer.business.items.1.label',
      'footer.business.items.1.value',
      'footer.business.items.2.label',
      'footer.business.items.2.value',
      'footer.business.items.3.label',
      'footer.business.items.3.value',
      'footer.business.items.4.label',
      'footer.business.items.4.value',
      'footer.business.items.5.label',
      'footer.business.items.5.value',
      'footer.business.items.6.label',
      'footer.business.items.6.value',
      'footer.business.items.7.label',
      'footer.business.items.7.value',
      'footer.business.items.8.label',
      'footer.business.items.8.value',
      'footer.business.items.9.label',
      'footer.business.items.9.value'
    ]
  },
  {
    titleKey: 'footer.sectionCollections',
    paths: [
      'footer.collectionCategoryLinks.0.label',
      'footer.collectionCategoryLinks.0.href',
      'footer.collectionCategoryLinks.1.label',
      'footer.collectionCategoryLinks.1.href',
      'footer.collectionCategoryLinks.2.label',
      'footer.collectionCategoryLinks.2.href'
    ]
  },
  {
    titleKey: 'footer.sectionSocial',
    paths: [
      'footer.socialLinks.instagram',
      'footer.socialLinks.youtube',
      'footer.socialLinks.facebook',
      'footer.socialLinks.kakao',
      'footer.socialLinks.twitter',
      'footer.socialLinks.blog'
    ]
  },
  {
    titleKey: 'footer.sectionNavigation',
    paths: [
      'navigation.brandLabel',
      'navigation.primaryLabel',
      'navigation.mobileLabel',
      'navigation.languageSwitcherLabel',
      'navigation.languageLabels.ko',
      'navigation.languageLabels.en',
      'navigation.openMenu',
      'navigation.closeMenu',
      'navigation.logoHome',
      'navigation.submenuLabel',
      'navigation.expand',
      'navigation.collapse',
      'navigation.items.home',
      'navigation.items.chronicle',
      'navigation.items.legacy',
      'navigation.items.loyalty',
      'navigation.items.credibility',
      'navigation.items.achievement',
      'navigation.items.specialty',
      'navigation.items.technique',
      'navigation.items.making',
      'navigation.items.collection',
      'navigation.items.news',
      'navigation.items.golf',
      'navigation.contactCta',
      'navigation.mega.legacy.eyebrow',
      'navigation.mega.legacy.title',
      'navigation.mega.legacy.descriptions.loyalty',
      'navigation.mega.legacy.descriptions.credibility',
      'navigation.mega.legacy.descriptions.achievement',
      'navigation.mega.specialty.eyebrow',
      'navigation.mega.specialty.title',
      'navigation.mega.specialty.descriptions.technique',
      'navigation.mega.specialty.descriptions.making',
      'navigation.mega.specialty.descriptions.collection',
      'navigation.hrefs.home',
      'navigation.hrefs.chronicle',
      'navigation.hrefs.legacy',
      'navigation.hrefs.loyalty',
      'navigation.hrefs.credibility',
      'navigation.hrefs.achievement',
      'navigation.hrefs.specialty',
      'navigation.hrefs.technique',
      'navigation.hrefs.making',
      'navigation.hrefs.collection',
      'navigation.hrefs.news',
      'navigation.hrefs.golf',
      'navigation.hrefs.golfInquiry',
      'navigation.hrefs.contact'
    ]
  }
];

type AdminFooterPageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function AdminFooterPage({searchParams}: AdminFooterPageProps) {
  const {locale: adminLocale, messages, t} = await getAdminI18n();
  const query = await searchParams;
  const definition = getManagedPageDefinition(commonPageKey);
  const row = await getPage(commonPageKey);

  if (!definition) {
    notFound();
  }

  const localeMessages = Object.fromEntries(
    await Promise.all(locales.map(async (locale) => [locale, await getLocaleMessages(locale)] as const))
  ) as Record<Locale, Awaited<ReturnType<typeof getLocaleMessages>>>;
  const localeData = locales.map((locale) => getFooterLocaleData(locale, definition, row, localeMessages[locale]));
  const fieldsByPath = new Map(definition.fields.map((field) => [field.path, field]));
  const koMain = localeData.find((data) => data.locale === 'ko')
    ?.groups.find((group) => group.key === mainGroupKey)?.content;
  const enMain = localeData.find((data) => data.locale === 'en')
    ?.groups.find((group) => group.key === mainGroupKey)?.content;
  const englishField = fieldsByPath.get('features.englishEnabled');
  const englishEnabled =
    getObjectValueAtPath(koMain, 'features.englishEnabled') === true ||
    getObjectValueAtPath(enMain, 'features.englishEnabled') === true;

  return (
    <>
      <PageHeader
        title={t('footer.title')}
        description={t('footer.description')}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/ko" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
              {t('page.previewKo')}
            </Link>
            <Link href="/en" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
              {t('page.previewEn')}
            </Link>
          </div>
        }
      />

      <AdminActionAlert searchParams={query} title={t('cmsAlert.title')} fallbackMessage={query?.error === 'file' ? t('page.uploadError') : t('cmsAlert.fallback')} />

      <form action={savePageAction} className="grid gap-6 pb-24">
        <input type="hidden" name="pageKey" value={commonPageKey} />
        <input type="hidden" name="returnTo" value={footerReturnPath} />
        <input type="hidden" name="section" value={row?.section ?? definition.section} />
        <input type="hidden" name="sortOrder" value={row?.sortOrder ?? definition.sortOrder} />

        <Panel className="p-5">
          <input type="hidden" name="englishEnabled.present" value="1" />
          <h2 className="mb-4 border-b border-[#e4e7ec] pb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">
            {t('footer.sectionVisibility')}
          </h2>
          {englishField ? (
            <CheckboxField
              label={getLocalizedPageFieldLabel(englishField, adminLocale)}
              name="englishEnabled"
              defaultChecked={englishEnabled}
            />
          ) : null}
        </Panel>

        <ExternalSitesEditor
          itemsKo={externalSiteItems(koMain)}
          itemsEn={externalSiteItems(enMain)}
          labels={{
            title: t('externalSites.title'),
            description: t('externalSites.description'),
            add: t('externalSites.add'),
            labelKo: t('externalSites.labelKo'),
            labelEn: t('externalSites.labelEn'),
            href: t('externalSites.href'),
            enabled: t('externalSites.enabled'),
            moveUp: t('externalSites.moveUp'),
            moveDown: t('externalSites.moveDown'),
            remove: t('externalSites.remove'),
            empty: t('externalSites.empty')
          }}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          {localeData.map((data) => (
            <FooterLocalePanel
              key={data.locale}
              data={data}
              adminLocale={adminLocale}
              messages={messages}
              fieldsByPath={fieldsByPath}
              t={t}
            />
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/admin" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
            {t('common.cancel')}
          </Link>
          <SubmitButton>{t('footer.save')}</SubmitButton>
        </div>

        <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-[80] flex items-center gap-2 rounded-xl border border-[#d9dee7] bg-white/95 p-2 shadow-[0_18px_45px_rgba(16,24,39,.16)] backdrop-blur md:right-8">
          <Link href="/admin" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
            {t('common.cancel')}
          </Link>
          <SubmitButton>{t('footer.save')}</SubmitButton>
        </div>
      </form>
    </>
  );
}

function externalSiteItems(content: unknown): ExternalSiteItem[] {
  const value = getObjectValueAtPath(content, 'footer.externalSites.items');
  return Array.isArray(value) ? value as ExternalSiteItem[] : [];
}

function FooterLocalePanel({
  data,
  adminLocale,
  messages,
  fieldsByPath,
  t
}: {
  data: FooterLocaleData;
  adminLocale: AdminLocale;
  messages: Record<string, string>;
  fieldsByPath: Map<string, PageFieldDefinition>;
  t: (key: string) => string;
}) {
  const suffix = localeFieldSuffixes[data.locale];
  const mainContent = data.groups.find((group) => group.key === mainGroupKey)?.content ?? {};

  return (
    <Panel className="p-5">
      <textarea hidden readOnly name={`seo${suffix}`} value={formatJson(data.seo)} />
      {data.groups.map((group) => (
        <textarea key={group.key} hidden readOnly name={`content${suffix}.${group.key}`} value={formatJson(group.content)} />
      ))}

      <h2 className="mb-4 border-b border-[#e4e7ec] pb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">
        {getContentLocaleLabel(messages, data.locale)}
      </h2>

      <div className="grid gap-5">
        {footerFieldSections.map((section) => (
          <section key={section.titleKey} className="grid gap-4 rounded-md border border-[#d9dee7] bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">
              {t(section.titleKey)}
            </h3>
            <div className="grid gap-4">
              {section.paths.map((path) => {
                const field = fieldsByPath.get(path);

                if (!field) {
                  return null;
                }

                return (
                  <FooterField
                    key={path}
                    field={field}
                    value={getObjectValueAtPath(mainContent, path)}
                    locale={data.locale}
                    adminLocale={adminLocale}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Panel>
  );
}

function FooterField({
  field,
  value,
  locale,
  adminLocale
}: {
  field: PageFieldDefinition;
  value: unknown;
  locale: Locale;
  adminLocale: AdminLocale;
}) {
  const name = `contentField.${locale}.${mainGroupKey}.${field.path}`;
  const label = getLocalizedPageFieldLabel(field, adminLocale);
  const text = stringValue(value);

  if (field.type === 'textarea') {
    return <TextAreaField label={label} name={name} defaultValue={text} rows={field.rows ?? 3} />;
  }

  if (field.type === 'link') {
    return <TextField label={label} name={name} defaultValue={text} inputMode="url" editorControls={false} placeholder="/contact, https://…, mailto:…" />;
  }

  if (typeof value === 'boolean') {
    return <CheckboxField label={label} name={name} defaultChecked={value} />;
  }

  return <TextField label={label} name={name} defaultValue={text} />;
}

function getFooterLocaleData(
  locale: Locale,
  definition: PageDefinition,
  row: Awaited<ReturnType<typeof getPage>>,
  messages: Awaited<ReturnType<typeof getLocaleMessages>>
): FooterLocaleData {
  const rowContent = row?.content[locale] ?? {};

  return {
    locale,
    groups: getPageContentGroups(definition).map((group) => {
      const fallbackContent = readStaticContent(messages, group.sourcePath);
      const overrideContent = getPageContentGroupOverride(rowContent, group.key);

      return {
        key: group.key,
        content: deepMergeJson(fallbackContent, overrideContent)
      };
    }),
    seo: cloneJson((row?.seo[locale] && typeof row.seo[locale] === 'object' ? row.seo[locale] : {}) as Record<string, unknown>)
  };
}

function readStaticContent(messages: Awaited<ReturnType<typeof getLocaleMessages>>, sourcePath: string) {
  const content = getObjectValueAtPath(messages, sourcePath);

  return cloneJson((content && typeof content === 'object' ? content : {}) as Record<string, unknown>);
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function stringValue(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
}
