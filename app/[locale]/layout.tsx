import type {Metadata} from 'next';
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import '@/app/globals.css';
import {LenisProvider} from '@/components/motion/lenis-provider';
import {ReducedMotionProvider} from '@/components/motion/reduced-motion-provider';
import {SiteStructuredData} from '@/components/site/site-structured-data';
import {routing, type Locale} from '@/i18n/routing';
import {isEnglishEnabledForSite} from '@/lib/english-visibility';
import {getLocaleMessages} from '@/lib/locale-messages';
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
  const englishEnabled = await isEnglishEnabledForSite();

  return {
    metadataBase,
    title: t('title'),
    description: t('description'),
    robots: previewNoindexRobots(),
    alternates: {
      languages: englishEnabled
        ? {ko: '/ko', en: '/en', 'x-default': '/ko'}
        : {ko: '/ko', 'x-default': '/ko'}
    },
    icons: {
      icon: [
        {url: '/favicon.ico', sizes: '32x32'},
        {url: '/favicon.svg', type: 'image/svg+xml'},
        {url: '/icon-192.png', sizes: '192x192', type: 'image/png'}
      ],
      apple: [{url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png'}]
    }
  };
}

export default async function LocaleLayout({children, params}: Props) {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const [messages, englishEnabled] = await Promise.all([
    getLocaleMessages(locale as Locale),
    isEnglishEnabledForSite()
  ]);
  // Client namespaces are also sourced through the CMS-aware message boundary so
  // header, 404, and other client navigation destinations update immediately.
  const clientMessages = {
    common: messages.common,
    notFound: messages.notFound
  };
  const localeClass = locale === 'ko' ? 'locale-ko' : 'locale-en';

  return (
    <html lang={locale} className={localeClass}>
      <body className="bg-bg text-text font-body">
        <SiteStructuredData englishEnabled={englishEnabled} />
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
