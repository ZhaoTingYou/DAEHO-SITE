import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';

import type {Locale} from '@/i18n/routing';
import {getLocaleMessages} from '@/lib/locale-messages';

type Props = {
  params: Promise<{locale: Locale}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return {title: getLocaleMessages(locale).legalPages.terms.title};
}

export default async function TermsPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const content = getLocaleMessages(locale).legalPages.terms;

  return (
    <main className="bg-bg text-text">
      <section className="pt-28">
        <div className="mx-auto max-w-[760px] px-container pb-section pt-[clamp(48px,7vw,104px)]">
          <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.26em] text-subtext">
            {content.eyebrow}
          </p>
          <h1 className="mt-4 font-heading text-[clamp(28px,3.4vw,42px)] font-semibold leading-[1.12] text-primary">
            {content.title}
          </h1>
          <p className="mt-8 font-body text-[14px] leading-[1.9] text-text">{content.notice}</p>
        </div>
      </section>
    </main>
  );
}
