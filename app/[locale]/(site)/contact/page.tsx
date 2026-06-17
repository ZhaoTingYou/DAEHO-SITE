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
  const messages = getLocaleMessages(locale);
  const text = messages.contact;
  const defaultType = getInquiryType(query?.type);

  return (
    <main className="bg-bg text-text">
      <section className="bg-bg pt-28">
        <div className="mx-auto grid min-h-[74dvh] max-w-[1440px] gap-12 px-container py-section lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <Reveal>
            <SectionIntro eyebrow={text.hero.eyebrow} title={text.hero.title}>
              <p>{text.hero.body}</p>
            </SectionIntro>
          </Reveal>
          <Reveal className="bg-bg p-5 shadow-[0_24px_80px_rgba(16,29,48,0.08)] md:p-8">
            <ContactForm copy={messages.forms.contact} defaultType={defaultType} />
          </Reveal>
        </div>
      </section>

      <section className="bg-bg py-section">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-container lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal className="space-y-6 bg-white p-6 shadow-[0_18px_70px_rgba(16,29,48,0.06)] md:p-8">
            <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.22em] text-accent">
              {text.infoTitle}
            </p>
            {[text.address, text.phone, text.email, text.hours].map((item) => (
              <div key={item} className="border-t border-hairline pt-4 font-body text-[14px] leading-7 text-primary">
                {item}
              </div>
            ))}
          </Reveal>
          <Reveal className="space-y-5">
            <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.22em] text-subtext">
              {text.faqTitle}
            </p>
            {text.faqs.map((item) => (
              <details key={item.question} className="group bg-white p-5 shadow-[0_12px_44px_rgba(16,29,48,0.05)]">
                <summary className="cursor-pointer font-body text-base font-semibold text-primary">
                  {item.question}
                </summary>
                <p className="mt-4 font-body text-sm leading-7 text-subtext">{item.answer}</p>
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
