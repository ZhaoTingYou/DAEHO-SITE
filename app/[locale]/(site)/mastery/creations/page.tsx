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
      <section className="relative overflow-hidden bg-white pt-[calc(var(--mobile-header-height)+env(safe-area-inset-top)+24px)] lg:bg-bg lg:pt-28">
        <h1 className="sr-only">
          {content.hero.title}
        </h1>
        <div className="mobile-creations-masthead lg:hidden">
          <div className="mx-auto max-w-[520px] px-[var(--mobile-page-gutter)] pb-12 pt-8">
            <ScrollText>
              <p className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                Curated Works
              </p>
              <p
                aria-hidden="true"
                className="mobile-display mt-5 break-words [font-family:'Cormorant_Garamond',serif] font-bold uppercase text-primary"
              >
                {content.hero.title}
              </p>
              <p className="mt-7 max-w-[28rem] whitespace-pre-line font-heading text-[16px] font-semibold leading-[1.75] text-primary/82">
                {content.hero.subtitle}
              </p>
              <div className="mt-10 flex min-h-11 items-center justify-between gap-5 border-t border-primary/15 pt-4 font-body text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/55">
                <span className="font-numeric text-accent">
                  {String(filters.length).padStart(2, '0')}
                </span>
                <span className="text-right">{content.gallery.title}</span>
              </div>
            </ScrollText>
          </div>
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
