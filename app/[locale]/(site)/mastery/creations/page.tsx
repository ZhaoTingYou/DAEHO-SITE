import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';

import {ScrollText} from '@/components/motion/scroll-text';
import {SpecialtyCollectionGallery} from '@/components/specialty/specialty-collection-gallery';
import type {Locale} from '@/i18n/routing';
import {resolveCmsHref} from '@/lib/cms-link-core.mjs';
import {imageExists} from '@/lib/image-exists';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';

type Props = {
  params: Promise<{locale: Locale}>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'collection');
}

export default async function CollectionPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const messages = await getLocaleMessages(locale);
  const content = messages.specialtyPages.collection;
  const text = messages.collectionUi;
  const filters = content.gallery.filters.map((filter) => ({
    ...filter,
    href: resolveCmsHref(locale, filter.href, `/mastery/creations/${filter.id}`),
    hasImage: Boolean(filter.image && imageExists(filter.image))
  }));

  return (
    <main className="mobile-page-shell bg-bg text-text">
      <section className="relative flex min-h-[68dvh] flex-col overflow-hidden bg-[#EFE8DC] pt-[calc(var(--mobile-header-height)+env(safe-area-inset-top)+24px)] lg:block lg:min-h-0 lg:bg-bg lg:pt-28">
        <h1 className="sr-only">
          {content.hero.title}
        </h1>
        <div className="mobile-creations-opening flex flex-1 items-end lg:hidden">
          <ScrollText className="w-full px-[var(--mobile-page-gutter)] pb-12 pt-10">
            <p aria-hidden="true" className="font-body text-[10px] font-bold uppercase tracking-[0.28em] text-accent">
              Objects of distinction
            </p>
            <p aria-hidden="true" className="mt-6 [font-family:'Cormorant_Garamond',serif] text-[clamp(44px,14vw,64px)] font-bold uppercase leading-[0.84] tracking-[-0.045em] text-primary">
              Three stories.
              <span className="ml-[10vw] mt-2 block font-normal italic text-accent">
                One signature.
              </span>
            </p>
            <p className="ml-auto mt-8 max-w-[21rem] whitespace-pre-line font-heading text-[16px] font-semibold leading-[1.75] text-primary/75">
              {content.hero.subtitle}
            </p>
            <div aria-hidden="true" className="mt-10 flex items-end justify-end gap-3 font-body uppercase tracking-[0.2em] text-primary/55">
              <span className="font-numeric text-[22px] italic text-accent">
                {String(filters.length).padStart(2, '0')}
              </span>
              <span className="pb-1 text-[9px] font-semibold">Creative worlds</span>
            </div>
            <div aria-hidden="true" className="mt-5 h-14 w-px bg-primary/25" />
          </ScrollText>
        </div>

        <div className="mx-auto hidden max-w-[1220px] px-container pb-[clamp(80px,8vw,132px)] pt-[clamp(70px,8vw,122px)] lg:block">
          <ScrollText className="mx-auto max-w-[720px] text-center">
            <p aria-hidden="true" className="[font-family:'Cormorant_Garamond',serif] text-[clamp(40px,3.7vw,58px)] font-bold uppercase leading-none tracking-[0.04em] text-accent">
              {content.hero.title}
            </p>
            <p className="mx-auto mt-[27px] max-w-xl whitespace-pre-line font-heading text-[15px] font-semibold leading-[1.85] text-primary">
              {content.hero.subtitle}
            </p>
          </ScrollText>
        </div>
      </section>

      <section>
        <SpecialtyCollectionGallery
          filters={filters}
          chooseLabel={text.chooseLabel}
          countSuffix={text.countSuffix}
          viewLabel={text.view}
          locale={locale}
        />
      </section>
    </main>
  );
}
