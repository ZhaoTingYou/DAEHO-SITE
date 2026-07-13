import Link from 'next/link';

import type {Locale} from '@/i18n/routing';
import {externalLinks} from '@/lib/config';
import {getLocaleMessages} from '@/lib/locale-messages';
import {localeShortLabels, locales} from '@/lib/locales';
import {withLocale} from '@/lib/site-map';

import {ExternalSiteLink} from './external-site-link';

type SiteFooterProps = {
  locale: Locale;
  golfEnabled: boolean;
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

const showFooterExternalLinks = false;
const socialLinkItems = [
  {key: 'instagram', label: 'Instagram'},
  {key: 'youtube', label: 'YouTube'},
  {key: 'facebook', label: 'Facebook'},
  {key: 'kakao', label: 'Kakao'},
  {key: 'twitter', label: 'Twitter'},
  {key: 'blog', label: 'Blog'}
] as const;
type SocialLinkKey = (typeof socialLinkItems)[number]['key'];

export async function SiteFooter({locale, golfEnabled}: SiteFooterProps) {
  const text = (await getLocaleMessages(locale)).common;
  const navLabels = text.navigation.items;
  const externalLabels = text.footer.externalSites;
  const {business, legal} = text.footer;
  const contactLabel = text.navigation.contactCta;
  const collectionCategoryLinks = text.footer.collectionCategoryLinks ?? [];
  const socialLinks = text.footer.socialLinks ?? {};
  const visibleSocialLinks = socialLinkItems
    .map((item) => ({...item, href: socialLinks[item.key] ?? ''}))
    .filter((item) => item.href.trim().length > 0);
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
        {label: navLabels.technique, href: '/mastery/technique'},
        {label: navLabels.making, href: '/mastery/making'},
        {label: navLabels.collection, href: '/mastery/creations'},
        ...collectionCategoryLinks
      ]
    },
    {
      heading: navLabels.news,
      href: '/news',
      links: []
    },
    ...(golfEnabled ? [
      {
        heading: navLabels.golf,
        href: '/golf',
        links: [
          {label: text.footer.golfInquiry, href: '/golf/inquiry'}
        ]
      }
    ] : []),
    {
      heading: contactLabel,
      href: '/contact',
      links: []
    }
  ];
  const year = new Date().getFullYear();
  const rightsText = formatFooterRights(legal.rights, year);

  return (
    <footer className="mobile-site-footer relative z-20 border-t border-hairline bg-white text-primary">
      <div className="mx-auto max-w-[1440px] px-container pt-16 pb-0 md:py-[clamp(56px,7vw,96px)]">
        <div className="grid gap-8 border-b border-hairline pb-8 md:gap-10 md:pb-12 lg:grid-cols-[minmax(260px,0.52fr)_minmax(0,0.48fr)] lg:items-start">
          <div className="space-y-4">
            <Link href={withLocale(locale, '/')} className="inline-flex min-h-11 items-center font-heading text-[28px] font-semibold tracking-[0.18em] text-primary">
              DAEHO
            </Link>
            <p className="max-w-sm whitespace-pre-line font-body text-[14px] leading-6 text-subtext">
              {text.footer.tagline}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:border-l lg:border-hairline lg:pl-16">
            {visibleSocialLinks.length > 0 ? (
              <div>
                <p className="footer-label">SNS</p>
                <div className="footer-social-grid">
                  {visibleSocialLinks.map((item) => (
                    <ExternalSiteLink key={item.key} label={item.label} href={item.href} className="footer-link footer-link--social footer-link--social-icon">
                      <SocialIcon name={item.key} />
                    </ExternalSiteLink>
                  ))}
                </div>
              </div>
            ) : null}

            {showFooterExternalLinks ? (
              <div>
                <p className="footer-label">{text.footer.otherSites}</p>
                <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3">
                  <ExternalSiteLink label={externalLabels.daeho} href={externalLinks.daeho} className="footer-link" />
                  <ExternalSiteLink label={externalLabels.oh} href={externalLinks.oh} className="footer-link" />
                  <ExternalSiteLink label={externalLabels.vulcan} href={externalLinks.vulcan} className="footer-link" />
                </div>
              </div>
            ) : null}

            <div className={showFooterExternalLinks || visibleSocialLinks.length > 0 ? '' : 'sm:col-start-2'}>
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
          className={`grid grid-cols-2 gap-x-8 gap-y-7 pt-8 sm:grid-cols-3 md:gap-x-10 md:gap-y-10 md:pt-[clamp(42px,5vw,72px)] ${golfEnabled ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}
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
                <div className="footer-subnav grid">
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

      <div className="bg-white px-container py-6 md:py-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="font-body text-[12px] leading-6 text-subtext">
              {rightsText}
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

function formatFooterRights(rights: string, year: number) {
  const trimmedRights = rights.trim();

  if (/copyright|©/i.test(trimmedRights)) {
    return trimmedRights;
  }

  return `© ${year} DAEHO. ${trimmedRights}`;
}

function SocialIcon({name}: {name: SocialLinkKey}) {
  switch (name) {
    case 'instagram':
      return (
        <svg className="footer-social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
        </svg>
      );
    case 'youtube':
      return (
        <svg className="footer-social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M21 8.2c-.2-1.3-1-2.2-2.3-2.4C16.8 5.5 12 5.5 12 5.5s-4.8 0-6.7.3C4 6 3.2 6.9 3 8.2a32 32 0 0 0 0 7.6c.2 1.3 1 2.2 2.3 2.4 1.9.3 6.7.3 6.7.3s4.8 0 6.7-.3c1.3-.2 2.1-1.1 2.3-2.4a32 32 0 0 0 0-7.6Z" fill="currentColor" />
          <path d="M10.2 15.3V8.7l5.7 3.3-5.7 3.3Z" fill="white" />
        </svg>
      );
    case 'facebook':
      return (
        <svg className="footer-social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M15 8h2.7V4.2A21 21 0 0 0 14.1 4c-3.6 0-5.8 2.1-5.8 5.9V12H5v4.2h3.3V22h4.5v-5.8h3.5l.7-4.2h-4.2V10.3C12.8 8.9 13.3 8 15 8Z" fill="currentColor" />
        </svg>
      );
    case 'kakao':
      return (
        <svg className="footer-social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 4C7 4 3 7.2 3 11.1c0 2.5 1.7 4.7 4.2 5.9l-.6 2.9 3.2-1.9c.7.1 1.5.2 2.2.2 5 0 9-3.2 9-7.1S17 4 12 4Z" fill="currentColor" />
          <path d="M8.9 14.8V8h1.7v2.6L13.2 8h2.1l-2.9 3 3.1 3.8h-2.2l-2.7-3.3v3.3H8.9Z" fill="white" />
        </svg>
      );
    case 'twitter':
      return (
        <svg className="footer-social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4.6 4h4.6l3.6 5 4.5-5H21l-6.5 7.3L21.5 20h-4.6l-4.3-5.9L7.3 20H3.5l7.3-8.1L4.6 4Zm2.9 1.8 10.4 12.4h.8L8.4 5.8h-.9Z" fill="currentColor" />
        </svg>
      );
    case 'blog':
      return (
        <svg className="footer-social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="currentColor" />
          <path d="M7.8 16.3V7.7h2.3l4 5.1V7.7h2.1v8.6h-2.1l-4.1-5.2v5.2H7.8Z" fill="white" />
        </svg>
      );
  }
}
