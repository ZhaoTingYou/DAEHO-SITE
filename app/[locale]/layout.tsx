import type {Metadata} from 'next';
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {getMessages, getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import '@/app/globals.css';
import {LenisProvider} from '@/components/motion/lenis-provider';
import {ReducedMotionProvider} from '@/components/motion/reduced-motion-provider';
import {routing, type Locale} from '@/i18n/routing';
import type {LocaleMessages} from '@/lib/locale-messages';
import {metadataBase, previewNoindexRobots} from '@/lib/seo';

type Props = {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export async function generateMetadata({params}: Omit<Props, 'children'>): Promise<Metadata> {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: 'metadata'});

  return {
    metadataBase,
    title: t('title'),
    description: t('description'),
    robots: previewNoindexRobots(),
    alternates: {
      languages: {
        ko: '/ko',
        en: '/en',
        'x-default': '/'
      }
    },
    icons: {
      icon: '/favicon.svg'
    }
  };
}

export default async function LocaleLayout({children, params}: Props) {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = (await getMessages()) as LocaleMessages;
  // Only namespaces read via useTranslations in client components belong here;
  // server components get their copy through getLocaleMessages(locale) props.
  const clientMessages = {
    common: messages.common,
    notFound: messages.notFound
  };
  const localeClass = locale === 'ko' ? 'locale-ko' : 'locale-en';

  return (
    <html lang={locale} className={localeClass}>
      <body className="bg-bg text-text font-body">
        <a href="#main-content" className="skip-link">
          {messages.common.skipLink}
        </a>
        <NextIntlClientProvider messages={clientMessages} locale={locale as Locale}>
          <ReducedMotionProvider>
            <LenisProvider>
              <div id="main-content" tabIndex={-1}>
                {children}
              </div>
            </LenisProvider>
          </ReducedMotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
