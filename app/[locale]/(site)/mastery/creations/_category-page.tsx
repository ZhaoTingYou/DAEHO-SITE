import type {Metadata} from 'next';
import Link from 'next/link';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {SpecialtyCollectionCategory} from '@/components/specialty/specialty-collection-gallery';
import type {Locale} from '@/i18n/routing';
import {getCollectionItemsForSite} from '@/lib/cms/public-content';
import {resolveCmsHref} from '@/lib/cms-link-core.mjs';
import {getCollectionCategorySeoFallback} from '@/lib/collection-category-seo';
import {imageExists} from '@/lib/image-exists';
import {getLocaleMessages} from '@/lib/locale-messages';
import {optionalImage} from '@/lib/optional-image';
import {getCmsPageSeoOverride, getDetailMetadata} from '@/lib/seo';

export type CollectionCategoryId = 'champion' | 'appointment' | 'bespoke';

type CategoryPageProps = {
  params: Promise<{locale: Locale}>;
  categoryId: CollectionCategoryId;
};

export const dynamic = 'force-dynamic';

export async function getCollectionCategoryMetadata({
  params,
  categoryId
}: CategoryPageProps): Promise<Metadata> {
  const {locale} = await params;
  const messages = await getLocaleMessages(locale);
  const category = messages.specialtyPages.collection.gallery.filters.find((filter) => filter.id === categoryId);

  if (!category) {
    return getDetailMetadata(locale, '/mastery/creations', 'COLLECTION', '');
  }

  const seo = await getCmsPageSeoOverride(locale, `mastery-creations-${categoryId}`);
  const fallbackSeo = getCollectionCategorySeoFallback(locale, categoryId, category);

  return getDetailMetadata(
    locale,
    `/mastery/creations/${categoryId}`,
    seo.title || fallbackSeo.title,
    seo.description || fallbackSeo.description,
    seo.image || undefined
  );
}

export async function CollectionCategoryPage({params, categoryId}: CategoryPageProps) {
  const {locale} = await params;
  setRequestLocale(locale);
  const messages = await getLocaleMessages(locale);
  const content = messages.specialtyPages.collection;
  const text = messages.collectionUi;
  const filters = content.gallery.filters.map((filter) => ({
    ...filter,
    href: resolveCmsHref(locale, filter.href, `/mastery/creations/${filter.id}`),
    mobileBackground: optionalImage(filter, 'mobileBackground'),
    hasImage: Boolean(filter.image && imageExists(filter.image))
  }));
  const items = await getCollectionItemsForSite(locale);

  if (!filters.some((filter) => filter.id === categoryId)) {
    notFound();
  }

  return (
    <main className="mobile-page-shell bg-white pb-[clamp(84px,9vw,132px)] pt-[calc(var(--mobile-header-height)+env(safe-area-inset-top)+20px)] text-text md:pt-28">
      <nav aria-label={text.filtersLabel} className="mx-auto flex max-w-[1480px] gap-2 overflow-x-auto border-y border-hairline px-[var(--mobile-page-gutter)] py-2 md:hidden">
        {filters.map((filter) => (
          <Link
            key={filter.id}
            href={filter.href}
            className={`mobile-tap-target inline-flex shrink-0 items-center px-3 font-body text-[11px] font-semibold uppercase tracking-[0.14em] ${filter.id === categoryId ? 'text-accent' : 'text-primary/65'}`}
            aria-current={filter.id === categoryId ? 'page' : undefined}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      <SpecialtyCollectionCategory
        categoryId={categoryId}
        filters={filters}
        items={items}
        empty={text.empty}
        filterLabel={text.filtersLabel}
        allLabel={text.allCategories}
        countSuffix={text.countSuffix}
        finder={text.finder}
        appointment={text.appointment}
        bespoke={text.bespoke}
        locale={locale}
        backHref={resolveCmsHref(locale, text.categoryBackHref, '/mastery/creations')}
      />
    </main>
  );
}
