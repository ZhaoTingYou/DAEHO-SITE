import Link from 'next/link';

import type {Locale} from '@/i18n/routing';
import {externalLinks} from '@/lib/config';
import {getLocaleMessages} from '@/lib/locale-messages';
import {localeShortLabels, locales} from '@/lib/locales';
import {navItems, withLocale} from '@/lib/site-map';

import {ExternalSiteLink} from './external-site-link';

type SiteFooterProps = {
  locale: Locale;
};

export function SiteFooter({locale}: SiteFooterProps) {
  const text = getLocaleMessages(locale).common;
  const navLabels = text.navigation.items;
  const externalLabels = text.footer.externalSites;
  const {business, legal} = text.footer;
  const footerNavItems = navItems.flatMap((item) => item.children ?? [item]);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-hairline bg-bg px-container py-14 text-primary">
      <div className="mx-auto grid max-w-[1440px] gap-10 md:grid-cols-[1fr_2fr]">
        <div className="space-y-4">
          <Link href={withLocale(locale, '/')} className="font-heading text-3xl font-semibold text-primary">
            DAEHO
          </Link>
          <p className="max-w-sm font-body text-sm leading-6 text-subtext">
            {text.footer.tagline}
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="footer-label">{text.footer.navigation}</p>
            <div className="mt-4 grid gap-3">
              {footerNavItems.map((item) => (
                <Link key={item.href} href={withLocale(locale, item.href)} className="footer-link">
                  {navLabels[item.id as keyof typeof navLabels]}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="footer-label">{text.footer.otherSites}</p>
            <div className="mt-4 grid gap-3">
              <ExternalSiteLink label={externalLabels.daeho} href={externalLinks.daeho} className="footer-link" />
              <ExternalSiteLink label={externalLabels.oh} href={externalLinks.oh} className="footer-link" />
              <ExternalSiteLink label={externalLabels.vulcan} href={externalLinks.vulcan} className="footer-link" />
            </div>
          </div>

          <div>
            <p className="footer-label">{text.footer.locale}</p>
            <div className="mt-4 flex gap-4">
              {locales.map((targetLocale) => (
                <Link key={targetLocale} href={withLocale(targetLocale, '/')} className="footer-link">
                  {localeShortLabels[targetLocale]}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-[1440px] border-t border-hairline pt-8">
        <p className="footer-label">{business.heading}</p>
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-body text-[12px] leading-6 text-subtext">
          {business.items.map((item) => (
            <div key={item.label} className="flex gap-2">
              <dt className="font-semibold text-primary/70">{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-col gap-4 border-t border-hairline pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href={withLocale(locale, '/terms')} className="footer-link">
              {legal.terms}
            </Link>
            <Link
              href={withLocale(locale, '/privacy')}
              className="footer-link font-semibold text-primary"
            >
              {legal.privacy}
            </Link>
          </div>
          <p className="font-body text-[12px] text-subtext">
            © {year} DAEHO. {legal.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
