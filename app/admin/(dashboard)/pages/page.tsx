import Link from 'next/link';

import {getAdminI18n} from '@/lib/admin-i18n';
import {assertAdminCapability} from '@/lib/cms/admin-session';
import {listPages} from '@/lib/cms/repositories';
import {
  deepMergeJson,
  getEditableLeafCountForPageGroup,
  getObjectValueAtPath,
  getPageContentGroupOverride,
  getPageContentGroups,
  managedPageDefinitions,
  type PageDefinition
} from '@/lib/cms/page-catalog';
import {
  getLocalizedPageDescription,
  getLocalizedPageSection,
  getLocalizedPageTitle
} from '@/lib/cms/page-catalog-i18n';
import {getLocaleMessages} from '@/lib/locale-messages';

import {EmptyState, PageHeader, Panel} from '../../_components/admin-shell';

export default async function AdminPagesPage() {
  await assertAdminCapability('content:read');
  const {locale: adminLocale, t} = await getAdminI18n();
  const pages = await listPages();
  const koMessages = await getLocaleMessages('ko');
  const pagesByKey = new Map(pages.map((page) => [page.pageKey, page]));
  const groups = groupManagedPages(adminLocale);

  return (
    <>
      <PageHeader
        title={t('page.title')}
        description={t('page.description')}
      />

      {managedPageDefinitions.length === 0 ? (
        <EmptyState title={t('page.noItemsTitle')} body={t('page.noItemsBody')} />
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-3">
            <PageMetric label={t('page.metricManaged')} value={managedPageDefinitions.length} />
            <PageMetric label={t('page.metricInitialized')} value={managedPageDefinitions.filter((definition) => pagesByKey.has(definition.pageKey)).length} />
            <PageMetric label={t('page.metricEditable')} value={managedPageDefinitions.reduce((total, definition) => total + countEditableElements(definition, pagesByKey.get(definition.pageKey)?.content.ko, koMessages), 0)} />
          </div>

          {groups.map(([section, definitions]) => (
            <Panel key={section} className="overflow-hidden">
              <div className="border-b border-[#e4e7ec] px-5 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{section}</h2>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                {definitions.map((definition) => {
                  const page = pagesByKey.get(definition.pageKey);
                  const fieldCount = countEditableElements(definition, page?.content.ko, koMessages);

                  return (
                    <article key={definition.pageKey} className="grid min-h-[236px] grid-rows-[1fr_auto] rounded-md border border-[#e4e7ec] bg-[#fbfcfe] p-4">
                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#98a2b3]">{getLocalizedPageSection(definition.section, adminLocale)}</p>
                            <h3 className="mt-2 font-heading text-xl font-semibold leading-tight text-[#101827]">{getLocalizedPageTitle(definition, adminLocale)}</h3>
                          </div>
                          <StatusBadge active={Boolean(page)} activeLabel={t('page.initialized')} inactiveLabel={t('page.pendingInit')} />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[#647084]">{getLocalizedPageDescription(definition, adminLocale)}</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#475467]">
                          <span className="rounded bg-white px-2 py-1 ring-1 ring-[#e4e7ec]">{definition.href}</span>
                          <span className="rounded bg-white px-2 py-1 ring-1 ring-[#e4e7ec]">{t('page.fieldCount', {count: fieldCount})}</span>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e7ec] pt-4">
                        <div className="flex gap-2">
                          <Link href={`/ko${definition.href === '/' ? '' : definition.href}`} className="inline-flex min-h-9 items-center rounded-md border border-[#d9dee7] bg-white px-3 text-xs font-semibold text-[#344054] hover:bg-[#f8fafc]">
                            KO
                          </Link>
                          <Link href={`/en${definition.href === '/' ? '' : definition.href}`} className="inline-flex min-h-9 items-center rounded-md border border-[#d9dee7] bg-white px-3 text-xs font-semibold text-[#344054] hover:bg-[#f8fafc]">
                            EN
                          </Link>
                        </div>
                        <Link href={`/admin/pages/${definition.pageKey}`} className="admin-on-dark inline-flex min-h-9 items-center rounded-md bg-[#7a2230] px-3 text-sm font-semibold text-white transition hover:bg-[#101827]">
                          {t('page.manage')}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Panel>
          ))}

        </div>
      )}
    </>
  );
}

function countEditableElements(definition: PageDefinition, pageContent: unknown, messages: Awaited<ReturnType<typeof getLocaleMessages>>) {
  return getPageContentGroups(definition).reduce((total, group) => {
    const staticContent = getObjectValueAtPath(messages, group.sourcePath) ?? {};
    const content = deepMergeJson(
      (staticContent && typeof staticContent === 'object' ? staticContent : {}) as Record<string, unknown>,
      getPageContentGroupOverride(pageContent, group.key)
    );

    return total + getEditableLeafCountForPageGroup(definition, group.key, content);
  }, 0);
}

function groupManagedPages(adminLocale: Awaited<ReturnType<typeof getAdminI18n>>['locale']) {
  const groups = new Map<string, typeof managedPageDefinitions>();

  for (const definition of managedPageDefinitions) {
    const section = getLocalizedPageSection(definition.section, adminLocale);
    groups.set(section, [...(groups.get(section) ?? []), definition]);
  }

  return Array.from(groups.entries());
}

function PageMetric({label, value}: {label: string; value: number}) {
  return (
    <div className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#647084]">{label}</p>
      <p className="mt-3 font-numeric text-3xl font-semibold text-[#101827]">{value}</p>
    </div>
  );
}

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#fffaeb] text-[#b54708]'}`}>
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
