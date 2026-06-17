import Link from 'next/link';

import type {Locale} from '@/i18n/routing';
import {externalLinks} from '@/lib/config';
import {getLocaleMessages} from '@/lib/locale-messages';
import {localeShortLabels, locales} from '@/lib/locales';
import {withLocale} from '@/lib/site-map';

import {ExternalSiteLink} from './external-site-link';

type SiteFooterProps = {
  locale: Locale;
};

type FooterLink = {
  label: string;
  href: string;
};

type FooterGroup = {
  heading: string;
  href?: string;
  links: FooterLink[];
};

export function SiteFooter({locale}: SiteFooterProps) {
  const text = getLocaleMessages(locale).common;
  const navLabels = text.navigation.items;
  const externalLabels = text.footer.externalSites;
  const {business, legal} = text.footer;
  const contactLabel = text.navigation.contactCta;
  const collectionCategoryLinks = locale === 'ko'
    ? [
        {label: '우승반지', href: '/mastery/creations/champion'},
        {label: '임관반지', href: '/mastery/creations/appointment'},
        {label: '주문제작', href: '/mastery/creations/bespoke'}
      ]
    : [
        {label: 'Championship Rings', href: '/mastery/creations/champion'},
        {label: 'Commission Rings', href: '/mastery/creations/appointment'},
        {label: 'Custom Products', href: '/mastery/creations/bespoke'}
      ];
  const footerGroups: FooterGroup[] = [
    {
      heading: navLabels.chronicle,
      href: '/archive',
      links: []
    },
    {
      heading: navLabels.legacy,
      links: [
        {label: navLabels.loyalty, href: '/heritage/loyalty'},
        {label: navLabels.credibility, href: '/heritage/credibility'},
        {label: navLabels.achievement, href: '/heritage/achievement'}
      ]
    },
    {
      heading: navLabels.specialty,
      links: [
        {label: navLabels.technique, href: '/mastery/making'},
        {label: navLabels.collection, href: '/mastery/creations'},
        ...collectionCategoryLinks
      ]
    },
    {
      heading: navLabels.news,
      href: '/news',
      links: []
    },
    {
      heading: navLabels.golf,
      href: '/golf',
      links: [
        {label: locale === 'ko' ? '골프 문의' : 'Golf Inquiry', href: '/golf/inquiry'}
      ]
    },
    {
      heading: contactLabel,
      href: '/contact',
      links: []
    }
  ];
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-20 border-t border-hairline bg-white text-primary">
      <div className="mx-auto max-w-[1440px] px-container py-[clamp(56px,7vw,96px)]">
        <div className="grid gap-10 border-b border-hairline pb-12 lg:grid-cols-[minmax(260px,0.52fr)_minmax(0,0.48fr)] lg:items-start">
          <div className="space-y-4">
            <Link href={withLocale(locale, '/')} className="font-heading text-[28px] font-semibold tracking-[0.18em] text-primary">
              DAEHO
            </Link>
            <p className="max-w-sm font-body text-[14px] leading-6 text-subtext">
              {text.footer.tagline}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:border-l lg:border-hairline lg:pl-16">
            <div>
              <p className="footer-label">{text.footer.otherSites}</p>
              <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3">
                <ExternalSiteLink label={externalLabels.daeho} href={externalLinks.daeho} className="footer-link" />
                <ExternalSiteLink label={externalLabels.oh} href={externalLinks.oh} className="footer-link" />
                <ExternalSiteLink label={externalLabels.vulcan} href={externalLinks.vulcan} className="footer-link" />
              </div>
            </div>

            <div>
              <p className="footer-label">{text.footer.locale}</p>
              <div className="mt-5 flex gap-5">
                {locales.map((targetLocale) => (
                  <Link key={targetLocale} href={withLocale(targetLocale, '/')} className="footer-link">
                    {localeShortLabels[targetLocale]}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <nav
          aria-label={text.footer.navigation}
          className="grid gap-x-10 gap-y-12 pt-[clamp(42px,5vw,72px)] sm:grid-cols-2 lg:grid-cols-6"
        >
          {footerGroups.map((group) => (
            <div key={group.heading} className="min-w-0">
              {group.href ? (
                <Link href={withLocale(locale, group.href)} className="footer-group-title">
                  {group.heading}
                </Link>
              ) : (
                <p className="footer-group-title">{group.heading}</p>
              )}

              {group.links.length > 0 ? (
                <div className="mt-5 grid gap-3">
                  {group.links.map((item) => (
                    <Link key={item.href} href={withLocale(locale, item.href)} className="footer-link footer-link--muted">
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </div>

      <div className="bg-[#F8F6F2] px-container py-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="font-body text-[12px] leading-6 text-subtext">
              © {year} DAEHO. {legal.rights}
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link href={withLocale(locale, '/terms')} className="footer-link footer-link--legal">
                {legal.terms}
              </Link>
              <Link href={withLocale(locale, '/privacy')} className="footer-link footer-link--legal font-semibold text-primary">
                {legal.privacy}
              </Link>
            </div>
          </div>

          <div className="mt-5 border-t border-hairline pt-5">
            <p className="footer-label">{business.heading}</p>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-body text-[12px] leading-6 text-subtext">
              {business.items.map((item) => (
                <div key={item.label} className="flex gap-2">
                  <dt className="font-semibold text-primary/70">{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </footer>
  );
}
