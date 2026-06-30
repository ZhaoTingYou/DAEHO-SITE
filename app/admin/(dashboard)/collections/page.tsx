import Link from 'next/link';

import {getAdminI18n} from '@/lib/admin-i18n';
import {listCollections, type CmsCollection} from '@/lib/cms/repositories';
import {imageSrc} from '@/lib/image-src';

import {deleteCollectionAction} from '../../actions';
import {DangerButton} from '../../_components/admin-fields';
import {AdminActionAlert} from '../../_components/admin-feedback';
import {EmptyState, PageHeader, Panel} from '../../_components/admin-shell';

type CollectionTranslation = {
  title?: string;
  categoryLabel?: string;
  sportCategoryLabel?: string;
};

type Props = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

type CollectionCategoryFilter = 'all' | 'champion' | 'appointment' | 'bespoke';
type CollectionStatusFilter = 'all' | 'visible' | 'hidden';

const collectionCategoryFilters = ['all', 'champion', 'appointment', 'bespoke'] as const;
const collectionStatusFilters = ['all', 'visible', 'hidden'] as const;

export default async function AdminCollectionsPage({searchParams}: Props) {
  const {t} = await getAdminI18n();
  const query = await searchParams;
  const items = await listCollections();
  const searchQuery = normalizeSearchQuery(query?.q);
  const categoryFilter = normalizeCategoryFilter(query?.category);
  const statusFilter = normalizeStatusFilter(query?.status);
  const filteredItems = items.filter((item) => collectionMatchesFilters(item, {
    query: searchQuery,
    category: categoryFilter,
    status: statusFilter
  }));

  return (
    <>
      <PageHeader
        title={t('collection.title')}
        description={t('collection.description')}
        action={
          <Link href="/admin/collections/new" className="admin-on-dark inline-flex min-h-10 items-center rounded-md bg-[#7a2230] px-4 text-sm font-semibold text-[#ffffff] transition hover:bg-[#101827]">
            {t('collection.newItem')}
          </Link>
        }
      />

      <AdminActionAlert searchParams={query} title={t('cmsAlert.title')} fallbackMessage={t('cmsAlert.fallback')} />

      {items.length === 0 ? (
        <EmptyState title={t('collection.noItemsTitle')} body={t('collection.noItemsBody')} />
      ) : (
        <div className="grid gap-4">
          <Panel className="p-4">
            <form method="get" className="collection-search-form grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_180px_auto]">
              <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
                <span>{t('collection.search')}</span>
                <input
                  name="q"
                  type="search"
                  defaultValue={searchQuery}
                  placeholder={t('collection.searchPlaceholder')}
                  className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
                <span>{t('collection.filterCategory')}</span>
                <select
                  name="category"
                  defaultValue={categoryFilter}
                  className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
                >
                  {collectionCategoryFilters.map((value) => (
                    <option key={value} value={value}>
                      {getCollectionCategoryFilterLabel(t, value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
                <span>{t('collection.filterStatus')}</span>
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
                >
                  {collectionStatusFilters.map((value) => (
                    <option key={value} value={value}>
                      {getCollectionStatusFilterLabel(t, value)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end gap-2">
                <button className="admin-on-dark min-h-10 rounded-md bg-[#7a2230] px-4 text-sm font-semibold text-white transition hover:bg-[#101827]">
                  {t('collection.applyFilters')}
                </button>
                <Link href="/admin/collections" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f8fafc]">
                  {t('collection.clearFilters')}
                </Link>
              </div>
            </form>
            <p className="mt-3 text-xs font-medium text-[#647084]">{t('collection.filteredCount', {count: filteredItems.length, total: items.length})}</p>
          </Panel>

          {filteredItems.length === 0 ? (
            <EmptyState title={t('collection.noFilteredItemsTitle')} body={t('collection.noFilteredItemsBody')} />
          ) : (
            <Panel className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] border-collapse text-left text-sm">
                  <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.12em] text-[#647084]">
                    <tr>
                      <th className="px-4 py-3">{t('collection.item')}</th>
                      <th className="px-4 py-3">{t('common.category')}</th>
                      <th className="px-4 py-3">{t('collection.sport')}</th>
                      <th className="px-4 py-3">{t('common.image')}</th>
                      <th className="px-4 py-3">{t('common.status')}</th>
                      <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4e7ec]">
                    {filteredItems.map((item) => {
                      const ko = (item.translations.ko ?? {}) as CollectionTranslation;
                      const previewSrc = imageSrc(item.imagePath);
                      return (
                        <tr key={item.id} className="align-middle">
                          <td className="px-4 py-4">
                            <p className="font-semibold text-[#101827]">{ko.title || item.slug}</p>
                            <p className="mt-1 font-numeric text-xs text-[#647084]">{item.slug}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-[#344054]">{getCollectionCategoryDisplay(t, item.category)}</p>
                            <p className="mt-1 text-xs text-[#647084]">{ko.categoryLabel}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-[#344054]">{item.sportCategory || '-'}</p>
                            <p className="mt-1 text-xs text-[#647084]">{ko.sportCategoryLabel}</p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="collection-thumbnail h-16 w-16 shrink-0 rounded-md border border-[#e4e7ec] bg-[#f8fafc] bg-cover bg-center"
                                style={previewSrc ? {backgroundImage: `url("${previewSrc}")`} : undefined}
                                aria-label={ko.title || item.slug}
                                role={previewSrc ? 'img' : undefined}
                              >
                                {previewSrc ? null : (
                                  <span className="flex h-full items-center justify-center px-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                                    {t('common.noImage')}
                                  </span>
                                )}
                              </div>
                              <p className="max-w-[220px] break-all font-numeric text-xs text-[#647084]">{item.imagePath || '-'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.isVisible ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#eef2f6] text-[#475467]'}`}>
                              {item.isVisible ? t('common.visible') : t('common.hidden')}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <Link href={`/admin/collections/${item.id}`} className="inline-flex min-h-9 items-center rounded-md border border-[#cbd3df] px-3 text-sm font-semibold text-[#344054] hover:bg-[#f8fafc]">
                                {t('common.edit')}
                              </Link>
                              <form action={deleteCollectionAction}>
                                <input type="hidden" name="id" value={item.id} />
                                <DangerButton>{t('common.delete')}</DangerButton>
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}

function normalizeSearchQuery(value?: string) {
  return (value ?? '').trim();
}

function normalizeCategoryFilter(value?: string): CollectionCategoryFilter {
  return collectionCategoryFilters.includes(value as CollectionCategoryFilter)
    ? value as CollectionCategoryFilter
    : 'all';
}

function normalizeStatusFilter(value?: string): CollectionStatusFilter {
  return collectionStatusFilters.includes(value as CollectionStatusFilter)
    ? value as CollectionStatusFilter
    : 'all';
}

function getCollectionCategoryFilterLabel(t: (key: string, values?: Record<string, string | number>) => string, value: CollectionCategoryFilter) {
  if (value === 'all') {
    return t('collection.categoryAll');
  }

  return getCollectionCategoryDisplay(t, value);
}

function getCollectionCategoryDisplay(t: (key: string, values?: Record<string, string | number>) => string, value: string) {
  switch (value) {
    case 'champion':
      return t('collection.categoryChampion');
    case 'appointment':
      return t('collection.categoryAppointment');
    case 'bespoke':
      return t('collection.categoryBespoke');
    default:
      return value || '-';
  }
}

function getCollectionStatusFilterLabel(t: (key: string, values?: Record<string, string | number>) => string, value: CollectionStatusFilter) {
  switch (value) {
    case 'visible':
      return t('common.visible');
    case 'hidden':
      return t('common.hidden');
    default:
      return t('collection.statusAll');
  }
}

function collectionMatchesFilters(
  item: CmsCollection,
  filters: {query: string; category: CollectionCategoryFilter; status: CollectionStatusFilter}
) {
  if (filters.category !== 'all' && item.category !== filters.category) {
    return false;
  }

  if (filters.status === 'visible' && !item.isVisible) {
    return false;
  }

  if (filters.status === 'hidden' && item.isVisible) {
    return false;
  }

  const query = filters.query.toLowerCase();
  if (!query) {
    return true;
  }

  return getCollectionSearchText(item).includes(query);
}

function getCollectionSearchText(item: CmsCollection) {
  const galleryText = Array.isArray(item.gallery)
    ? item.gallery.filter((image): image is string => typeof image === 'string').join(' ')
    : '';
  const translationText = Object.values(item.translations ?? {})
    .flatMap((translation) => {
      if (!translation || typeof translation !== 'object' || Array.isArray(translation)) {
        return [];
      }

      const record = translation as Record<string, unknown>;
      return [
        record.title,
        record.caption,
        record.categoryLabel,
        record.sportCategoryLabel
      ].filter((value): value is string => typeof value === 'string');
    })
    .join(' ');

  return [
    item.slug,
    item.category,
    item.sportCategory,
    item.imagePath,
    galleryText,
    translationText
  ].join(' ').toLowerCase();
}
