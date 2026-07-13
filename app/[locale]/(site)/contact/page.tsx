import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';

import {ContactForm} from '@/components/forms/contact-form';
import {Reveal} from '@/components/motion/reveal';
import {SectionIntro} from '@/components/section-intro';
import type {Locale} from '@/i18n/routing';
import {getLocaleMessages} from '@/lib/locale-messages';
import {getPageMetadata} from '@/lib/seo';

type Props = {
  params: Promise<{locale: Locale}>;
  searchParams?: Promise<{type?: string}>;
};

const inquiryTypes = ['appointment', 'championship', 'bespoke', 'other'] as const;
type InquiryType = (typeof inquiryTypes)[number];

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  return getPageMetadata(locale, 'contact');
}

export default async function ContactPage({params, searchParams}: Props) {
  const {locale} = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const messages = await getLocaleMessages(locale);
  const text = messages.contact;
  const defaultType = getInquiryType(query?.type);

  return (
    <main className="mobile-page-shell bg-bg text-text">
      <section className="bg-bg pt-[calc(var(--mobile-header-height)+env(safe-area-inset-top)+32px)] md:pt-28">
        <div className="mx-auto grid min-h-[80svh] max-w-[1440px] gap-8 px-[var(--mobile-page-gutter)] py-[var(--mobile-section-space)] md:min-h-[74dvh] md:gap-12 md:px-container md:py-section lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <Reveal>
            <SectionIntro eyebrow={text.hero.eyebrow} title={text.hero.title}>
              {text.hero.body ? <p>{text.hero.body}</p> : null}
            </SectionIntro>
          </Reveal>
          <Reveal className="bg-bg p-4 shadow-[0_24px_80px_rgba(16,29,48,0.08)] md:p-8">
            <ContactForm copy={messages.forms.contact} defaultType={defaultType} />
          </Reveal>
        </div>
      </section>

      <section className="bg-bg py-[var(--mobile-section-space)] md:py-section">
        <div className="mx-auto max-w-3xl px-[var(--mobile-page-gutter)] md:px-container">
          <Reveal className="space-y-5">
            <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.22em] text-subtext">
              {text.faqTitle}
            </p>
            {text.faqs.map((item) => (
              <details key={item.question} className="group bg-white p-4 shadow-[0_12px_44px_rgba(16,29,48,0.05)] md:p-5">
                <summary className="cursor-pointer font-body text-[16px] font-semibold leading-6 text-primary md:text-base">
                  {item.question}
                </summary>
                <p className="mobile-copy mt-4 break-words whitespace-pre-line font-body text-subtext md:text-sm md:leading-7">{item.answer}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>
    </main>
  );
}

function getInquiryType(type?: string): InquiryType {
  return inquiryTypes.includes(type as InquiryType) ? (type as InquiryType) : 'appointment';
}
