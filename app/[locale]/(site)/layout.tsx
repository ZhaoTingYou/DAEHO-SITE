import {hasLocale} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {AnalyticsProvider} from '@/components/analytics/analytics-provider';
import {BackToTopButton} from '@/components/site/back-to-top-button';
import {SiteFooter} from '@/components/site/site-footer';
import {SiteCursor} from '@/components/site/site-cursor';
import {SiteHeader} from '@/components/site/site-header';
import {SitePopup} from '@/components/site/site-popup';
import {routing, type Locale} from '@/i18n/routing';
import {isEnglishEnabledForSite} from '@/lib/english-visibility';
import {isGolfEnabledForSite} from '@/lib/golf-visibility';
import {resolveCmsHref} from '@/lib/cms-link-core.mjs';
import {getPublicLocaleMessages} from '@/lib/locale-messages';

type Props = {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
};

export const revalidate = 3600;

export default async function SiteLayout({children, params}: Props) {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const [englishEnabled, golfEnabled] = await Promise.all([
    isEnglishEnabledForSite(),
    isGolfEnabledForSite()
  ]);
  const messages = await getPublicLocaleMessages(locale as Locale, ['common', 'site-popup']);
  const externalSites = messages.common.footer.externalSites.items;
  const privacyHref = resolveCmsHref(locale, messages.common.navigation.hrefs.privacy, '/privacy');

  return (
    <AnalyticsProvider locale={locale as Locale} privacyHref={privacyHref}>
      <SiteCursor />
      <SitePopup config={messages.sitePopup} locale={locale as Locale} />
      <div className="site-cursor-scope">
        <SiteHeader
          locale={locale as Locale}
          englishEnabled={englishEnabled}
          golfEnabled={golfEnabled}
          externalSites={externalSites}
        />
        {children}
        <SiteFooter
          locale={locale as Locale}
          englishEnabled={englishEnabled}
          golfEnabled={golfEnabled}
          externalSites={externalSites}
        />
        <BackToTopButton label={locale === 'ko' ? '맨 위로' : 'Back to top'} />
      </div>
    </AnalyticsProvider>
  );
}
