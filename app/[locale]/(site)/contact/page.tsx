import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';

import {ContactFaqSection} from '@/components/contact/contact-faq-section';
import {ContactDirectPhoneNotice} from '@/components/forms/contact-direct-phone-notice';
import {ContactForm} from '@/components/forms/contact-form';
import {Reveal} from '@/components/motion/reveal';
import {SectionIntro} from '@/components/section-intro';
import {FaqStructuredData} from '@/components/site/faq-structured-data';
import type {Locale} from '@/i18n/routing';
import {getPublicLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';

type Props = {
  params: Promise<{locale: Locale}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'contact');
}

export default async function ContactPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const messages = await getPublicLocaleMessages(locale, ['contact']);
  const text = messages.contact;

  return (
    <main className="mobile-page-shell bg-bg text-text">
      <FaqStructuredData faqs={text.faqs} path={`/${locale}/contact`} />
      <section className="bg-bg pt-[calc(var(--mobile-header-height)+env(safe-area-inset-top)+32px)] md:pt-28">
        <div className="mx-auto grid min-h-[80svh] max-w-[1440px] gap-8 px-[var(--mobile-page-gutter)] py-[var(--mobile-section-space)] md:min-h-[74dvh] md:gap-12 md:px-container md:py-section lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <Reveal>
            <SectionIntro eyebrow={text.hero.eyebrow} title={text.hero.title} headingLevel="h1">
              {text.hero.body ? <p>{text.hero.body}</p> : null}
            </SectionIntro>
          </Reveal>
          <Reveal className="space-y-5 bg-bg p-4 shadow-[0_24px_80px_rgba(16,29,48,0.08)] md:space-y-6 md:p-8">
            <ContactDirectPhoneNotice copy={text.directPhone} />
            <ContactForm copy={messages.forms.contact} />
          </Reveal>
        </div>
      </section>

      <ContactFaqSection
        title={text.faqTitle}
        categories={text.faqCategories}
        otherLabel={text.faqCategoryLabels.other}
        faqs={text.faqs}
      />
    </main>
  );
}
