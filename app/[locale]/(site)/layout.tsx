import {hasLocale} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {SiteFooter} from '@/components/site/site-footer';
import {SiteCursor} from '@/components/site/site-cursor';
import {SiteHeader} from '@/components/site/site-header';
import {routing, type Locale} from '@/i18n/routing';

type Props = {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
};

export default async function SiteLayout({children, params}: Props) {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <>
      <SiteCursor />
      <div className="site-cursor-scope">
        <SiteHeader locale={locale as Locale} />
        {children}
        <SiteFooter locale={locale as Locale} />
      </div>
    </>
  );
}
