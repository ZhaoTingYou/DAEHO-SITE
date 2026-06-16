'use client';

import {AnimatePresence, motion} from 'framer-motion';
import {useTranslations} from 'next-intl';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useMemo, useRef, useState} from 'react';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';
import type {Locale} from '@/i18n/routing';
import {externalLinks} from '@/lib/config';
import {localeShortLabels, locales} from '@/lib/locales';
import {isActivePath, navItems, withLocale} from '@/lib/site-map';

import {ExternalSiteLink} from './external-site-link';

type SiteHeaderProps = {
  locale: Locale;
};

type MegaMenuKey = 'legacy' | 'specialty';

const navListVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.12
    }
  }
};

const navItemVariants = {
  hidden: {opacity: 0, y: -8},
  visible: {
    opacity: 1,
    y: 0,
    transition: {duration: 0.36, ease: [0.16, 1, 0.3, 1]}
  }
};

const instantItemVariants = {
  hidden: {opacity: 1, y: 0},
  visible: {opacity: 1, y: 0}
};

const showExternalHeaderLinks = false;

export function SiteHeader({locale}: SiteHeaderProps) {
  const navText = useTranslations('common.navigation');
  const footerText = useTranslations('common.footer');
  const externalText = useTranslations('common.footer.externalSites');
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollYRef = useRef(0);
  const scrollDeltaRef = useRef(0);
  const [atTop, setAtTop] = useState(true);
  const [overHomeHero, setOverHomeHero] = useState(true);
  const [isHidden, setIsHidden] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [hasHeaderFocus, setHasHeaderFocus] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<MegaMenuKey | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    legacy: false,
    specialty: false
  });

  const relativePath = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);

    if (locales.includes(parts[0] as Locale)) {
      return `/${parts.slice(1).join('/')}`;
    }

    return pathname || '/';
  }, [pathname]);

  const languageLinks = locales.map((targetLocale) => ({
    locale: targetLocale,
    label: localeShortLabels[targetLocale],
    href: withLocale(targetLocale, relativePath === '/' ? '/' : relativePath)
  }));
  const isHome = relativePath === '/';
  const contactLabel = navText('contactCta');
  const megaMenuDetails: Record<
    MegaMenuKey,
    {
      eyebrow: string;
      title: string;
      motif: string;
      descriptions: Record<string, string>;
    }
  > = {
    legacy: {
      eyebrow: navText('mega.legacy.eyebrow'),
      title: navText('mega.legacy.title'),
      motif: navText('mega.legacy.motif'),
      descriptions: {
        loyalty: navText('mega.legacy.descriptions.loyalty'),
        credibility: navText('mega.legacy.descriptions.credibility'),
        achievement: navText('mega.legacy.descriptions.achievement')
      }
    },
    specialty: {
      eyebrow: navText('mega.specialty.eyebrow'),
      title: navText('mega.specialty.title'),
      motif: navText('mega.specialty.motif'),
      descriptions: {
        technique: navText('mega.specialty.descriptions.technique'),
        collection: navText('mega.specialty.descriptions.collection')
      }
    }
  };

  const clearMegaCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMegaMenu = (key: MegaMenuKey) => {
    clearMegaCloseTimer();
    setOpenMenu(key);
  };

  const scheduleMegaClose = () => {
    clearMegaCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpenMenu(null);
    }, 150);
  };

  const toggleMobileMenu = () => {
    setIsMenuOpen((open) => {
      const nextOpen = !open;

      if (nextOpen) {
        setIsHidden(false);
        setOpenMenu(null);
      }

      return nextOpen;
    });
  };

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const nextAtTop = y < 8;
      const heroExitY = Math.max(360, window.innerHeight - 96);
      const nextOverHomeHero = isHome && y < heroExitY;
      const shouldKeepHeaderVisible =
        isMenuOpen || openMenu !== null || isHeaderHovered || hasHeaderFocus;

      setAtTop((current) => (current === nextAtTop ? current : nextAtTop));
      setOverHomeHero((current) =>
        current === nextOverHomeHero ? current : nextOverHomeHero
      );

      if (nextAtTop || shouldKeepHeaderVisible) {
        scrollDeltaRef.current = 0;
        setIsHidden(false);
      } else {
        const delta = y - lastScrollYRef.current;
        scrollDeltaRef.current += delta;

        if (Math.abs(scrollDeltaRef.current) >= 8) {
          if (scrollDeltaRef.current > 0 && y > 120) {
            setIsHidden(true);
            setOpenMenu(null);
          }

          if (scrollDeltaRef.current < 0) {
            setIsHidden(false);
          }

          scrollDeltaRef.current = 0;
        }
      }

      lastScrollYRef.current = y;
    };

    lastScrollYRef.current = window.scrollY;
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [hasHeaderFocus, isHeaderHovered, isHome, isMenuOpen, openMenu]);

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    const y = window.scrollY;
    const nextAtTop = y < 8;
    const heroExitY = Math.max(360, window.innerHeight - 96);

    lastScrollYRef.current = y;
    scrollDeltaRef.current = 0;
    const frame = window.requestAnimationFrame(() => {
      setAtTop(nextAtTop);
      setOverHomeHero(isHome && y < heroExitY);
      setIsHidden(false);
      setIsHeaderHovered(false);
      setHasHeaderFocus(false);
      setOpenMenu(null);
      setIsMenuOpen(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isHome, pathname]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      clearMegaCloseTimer();
    };
  }, []);

  const currentMegaItem = openMenu ? navItems.find((item) => item.id === openMenu) : undefined;
  const currentMegaDetails = openMenu ? megaMenuDetails[openMenu] : null;
  const isHeaderInteractive = isHeaderHovered || hasHeaderFocus;
  const isGolf = relativePath === '/golf';
  const isHomeHeroTransparent =
    isHome &&
    (overHomeHero || atTop) &&
    !isMenuOpen &&
    openMenu === null &&
    !isHeaderInteractive;
  const isGolfHeroTransparent =
    isGolf &&
    atTop &&
    !isMenuOpen &&
    openMenu === null &&
    !isHeaderInteractive;
  const isHeroTransparent = isHomeHeroTransparent || isGolfHeroTransparent;
  const isSolid = !isHeroTransparent && (!atTop || isMenuOpen || openMenu !== null || isHeaderInteractive);
  const navVariants = prefersReducedMotion ? {hidden: {}, visible: {}} : navListVariants;
  const itemVariants = prefersReducedMotion ? instantItemVariants : navItemVariants;

  return (
    <motion.header
      initial={false}
      animate={{y: isHidden ? '-100%' : '0%'}}
      transition={{
        duration: prefersReducedMotion ? 0 : isHidden ? 0.26 : 0.2,
        ease: [0.22, 0.61, 0.36, 1]
      }}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;

        if (nextTarget && event.currentTarget.contains(nextTarget as Node)) {
          return;
        }

        setHasHeaderFocus(false);
        scheduleMegaClose();
      }}
      onFocus={() => setHasHeaderFocus(true)}
      onMouseEnter={() => setIsHeaderHovered(true)}
      onMouseLeave={() => setIsHeaderHovered(false)}
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter,color] duration-300 ease-brand ${
        isSolid
          ? 'border-b border-hairline bg-bg/95 text-primary shadow-[0_18px_60px_rgba(16,29,48,.08)] backdrop-blur-md [text-shadow:none]'
          : isHeroTransparent
            ? 'border-b border-transparent bg-transparent text-white [text-shadow:0_1px_16px_rgba(16,29,48,.42)]'
            : 'border-b border-transparent bg-transparent text-primary [text-shadow:0_1px_16px_rgba(255,255,255,.72)]'
      }`}
    >
      <div className="hidden lg:block">
        <div className="mx-auto grid h-20 max-w-[1440px] grid-cols-[minmax(150px,1fr)_auto_minmax(150px,1fr)] items-center gap-6 px-container">
          <Link
            href={withLocale(locale, '/')}
            className="inline-flex min-h-11 items-center font-heading text-[22px] font-semibold tracking-[0.18em]"
            aria-label={navText('logoHome')}
          >
            DAEHO
          </Link>

          <motion.nav
            aria-label={navText('primaryLabel')}
            initial="hidden"
            animate="visible"
            variants={navVariants}
            className="flex items-center justify-center gap-6 xl:gap-8"
          >
            {navItems.map((item) => {
              const megaKey = isMegaMenuKey(item.id) ? item.id : null;
              const hasMega = megaKey !== null;
              const active = isActivePath(relativePath, item.href);
              const itemLabel = navText(`items.${item.id}`);
              const openDesktopMega = () => {
                if (megaKey) {
                  openMegaMenu(megaKey);
                }
              };

              return (
                <motion.div key={item.href} variants={itemVariants}>
                  {hasMega ? (
                    <button
                      type="button"
                      className={`site-nav-link border-0 bg-transparent p-0 ${active ? 'is-active' : ''}`}
                      aria-haspopup="true"
                      aria-expanded={openMenu === megaKey}
                      onMouseEnter={openDesktopMega}
                      onMouseLeave={scheduleMegaClose}
                      onFocus={openDesktopMega}
                      onClick={openDesktopMega}
                    >
                      {itemLabel}
                    </button>
                  ) : (
                    <Link
                      href={withLocale(locale, item.href)}
                      className={`site-nav-link ${active ? 'is-active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setOpenMenu(null)}
                    >
                      {itemLabel}
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </motion.nav>

          <div className="flex items-center justify-end gap-5 font-body text-[12px] font-semibold uppercase tracking-[0.12em]">
            <div className="flex items-center gap-3" aria-label={navText('languageSwitcherLabel')}>
              {languageLinks.map((item, index) => (
                <span key={item.locale} className="contents">
                  {index > 0 ? (
                    <span className="opacity-40" aria-hidden="true">
                      /
                    </span>
                  ) : null}
                  <Link
                    href={item.href}
                    className={`site-nav-link no-underline ${locale === item.locale ? 'opacity-100' : 'opacity-60'}`}
                    aria-current={locale === item.locale ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </span>
              ))}
            </div>

            <span className="h-3 w-px bg-current opacity-25" aria-hidden="true" />

            {showExternalHeaderLinks ? (
              <>
                <div className="flex items-center gap-4">
                  <ExternalSiteLink label={externalText('daeho')} href={externalLinks.daeho} className="site-nav-link no-underline" />
                  <ExternalSiteLink label={externalText('oh')} href={externalLinks.oh} className="site-nav-link no-underline" />
                  <ExternalSiteLink label={externalText('vulcan')} href={externalLinks.vulcan} className="site-nav-link no-underline" />
                </div>

                <span className="h-3 w-px bg-current opacity-25" aria-hidden="true" />
              </>
            ) : null}

            <Link
              href={withLocale(locale, '/contact')}
              className={`consult-cta ${isHeroTransparent ? 'consult-cta--light' : 'consult-cta--accent'}`}
            >
              <span className="consult-cta__label">{contactLabel}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-container lg:hidden">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center"
          aria-label={isMenuOpen ? navText('closeMenu') : navText('openMenu')}
          aria-expanded={isMenuOpen}
          onClick={toggleMobileMenu}
        >
          <span className="relative h-4 w-6" aria-hidden="true">
            <span
              className={`absolute left-0 top-0 h-px w-6 bg-current transition duration-300 ${
                isMenuOpen ? 'translate-y-2 rotate-45' : ''
              }`}
            />
            <span
              className={`absolute left-0 top-2 h-px w-6 bg-current transition duration-300 ${
                isMenuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`absolute left-0 top-4 h-px w-6 bg-current transition duration-300 ${
                isMenuOpen ? '-translate-y-2 -rotate-45' : ''
              }`}
            />
          </span>
        </button>

        <Link
          href={withLocale(locale, '/')}
          className="font-heading text-[22px] font-semibold tracking-[0.14em]"
          aria-label={navText('logoHome')}
        >
          DAEHO
        </Link>

        <div className="flex min-h-11 items-center gap-2 font-body text-[12px] font-semibold uppercase tracking-[0.12em]">
          {languageLinks.map((item, index) => (
            <span key={item.locale} className="contents">
              {index > 0 ? (
                <span className="opacity-35" aria-hidden="true">
                  /
                </span>
              ) : null}
              <Link href={item.href} className={locale === item.locale ? 'opacity-100' : 'opacity-55'}>
                {item.label}
              </Link>
            </span>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {currentMegaItem && currentMegaDetails ? (
          <motion.div
            key={currentMegaItem.label}
            role="region"
            aria-label={navText('submenuLabel', {label: navText(`items.${currentMegaItem.id}`)})}
            initial={prefersReducedMotion ? {opacity: 1, scaleY: 1} : {opacity: 0, scaleY: 0.96}}
            animate={{opacity: 1, scaleY: 1}}
            exit={prefersReducedMotion ? {opacity: 0, scaleY: 1} : {opacity: 0, scaleY: 0.98}}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.36,
              ease: [0.16, 1, 0.3, 1]
            }}
            onMouseEnter={clearMegaCloseTimer}
            onMouseLeave={scheduleMegaClose}
            className="absolute inset-x-0 top-full hidden origin-top overflow-hidden border-t border-hairline bg-bg text-primary shadow-[0_30px_90px_rgba(16,29,48,.12)] [text-shadow:none] lg:block"
          >
            <motion.div
              className="h-px origin-left bg-accent"
              initial={{scaleX: prefersReducedMotion ? 1 : 0}}
              animate={{scaleX: 1}}
              exit={{scaleX: prefersReducedMotion ? 1 : 0}}
              transition={{duration: prefersReducedMotion ? 0 : 0.28, ease: [0.22, 0.61, 0.36, 1]}}
            />

            <div className="mx-auto grid max-w-[1440px] grid-cols-[0.8fr_1.7fr_0.7fr] gap-10 px-container py-9">
              <div>
                <p
                  className={`font-body text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    currentMegaItem.id === 'legacy' || currentMegaItem.id === 'specialty' ? 'text-accent' : 'text-subtext'
                  }`}
                >
                  {currentMegaDetails.eyebrow}
                </p>
                <p className="mt-3 max-w-[16rem] font-heading text-[22px] font-semibold leading-none">
                  {currentMegaDetails.title}
                </p>
              </div>

              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {transition: {staggerChildren: prefersReducedMotion ? 0 : 0.05}}
                }}
                className="grid gap-4"
              >
                {currentMegaItem.children?.map((child) => (
                  <motion.div
                    key={child.href}
                    variants={itemVariants}
                    className="border-b border-hairline last:border-b-0"
                  >
                    <Link
                      href={withLocale(locale, child.href)}
                      className="group grid min-h-16 gap-1 py-3"
                      onClick={() => setOpenMenu(null)}
                    >
                      <span className="font-body text-sm font-semibold uppercase tracking-[0.14em] transition-colors duration-300 group-hover:text-accent">
                        {navText(`items.${child.id}`)}
                      </span>
                      <span className="font-body text-sm leading-6 text-subtext">
                        {currentMegaDetails.descriptions[child.id]}
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              <div className="flex items-center justify-end">
                <div className="grid h-28 w-36 place-items-center border border-hairline bg-white/80 px-5 text-right font-numeric text-[22px] font-semibold leading-none text-primary/35 shadow-[0_16px_45px_rgba(16,29,48,.08)]">
                  {currentMegaDetails.motif}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div
            initial={{opacity: 0, y: prefersReducedMotion ? 0 : -16}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: prefersReducedMotion ? 0 : -16}}
            transition={{duration: prefersReducedMotion ? 0 : 0.3, ease: [0.22, 0.61, 0.36, 1]}}
            className="fixed inset-x-0 top-20 h-[calc(100dvh-80px)] overflow-y-auto bg-bg px-container py-10 text-primary [text-shadow:none] lg:hidden"
          >
            <motion.nav
              aria-label={navText('mobileLabel')}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {transition: {staggerChildren: prefersReducedMotion ? 0 : 0.06}}
              }}
              className="space-y-4"
            >
              {navItems.map((item) => {
                const hasChildren = Boolean(item.children?.length);
                const isExpanded = expanded[item.id];
                const details = isMegaMenuKey(item.id) ? megaMenuDetails[item.id] : null;
                const itemLabel = navText(`items.${item.id}`);
                const toggleExpanded = () =>
                  setExpanded((current) => ({
                    ...current,
                    [item.id]: !current[item.id]
                  }));

                return (
                  <motion.div
                    key={item.href}
                    variants={itemVariants}
                    className="border-b border-hairline pb-4"
                  >
                    {hasChildren ? (
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-label={navText(isExpanded ? 'collapse' : 'expand', {label: itemLabel})}
                        onClick={toggleExpanded}
                        className={`group flex min-h-14 w-full items-center justify-between gap-5 border-0 bg-transparent p-0 text-left ${
                          isActivePath(relativePath, item.href) ? 'text-accent' : ''
                        } focus-visible:text-accent focus-visible:outline-none`}
                      >
                        <span className="font-body text-[15px] font-semibold uppercase leading-none tracking-[0.22em]">
                          {itemLabel}
                        </span>
                        <span
                          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/18 bg-white/55 transition duration-300 ease-brand group-hover:border-current/34 group-focus-visible:border-current/45"
                          aria-hidden="true"
                        >
                          <span
                            className={`h-[7px] w-[7px] border-b border-r border-current transition duration-300 ease-brand ${
                              isExpanded ? '-translate-y-[1px] rotate-[225deg]' : '-translate-y-[2px] rotate-45'
                            }`}
                          />
                        </span>
                      </button>
                    ) : (
                      <Link
                        href={withLocale(locale, item.href)}
                        onClick={() => setIsMenuOpen(false)}
                        className={`flex min-h-14 items-center font-body text-[15px] font-semibold uppercase leading-none tracking-[0.22em] ${
                          isActivePath(relativePath, item.href) ? 'text-accent' : ''
                        } focus-visible:text-accent focus-visible:outline-none`}
                      >
                        {itemLabel}
                      </Link>
                    )}

                    {hasChildren && isExpanded ? (
                      <motion.div
                        initial={prefersReducedMotion ? {opacity: 1} : {opacity: 0, y: -6}}
                        animate={{opacity: 1, y: 0}}
                        transition={{duration: prefersReducedMotion ? 0 : 0.28, ease: [0.22, 0.61, 0.36, 1]}}
                        className="mt-1 grid gap-1 border-l border-accent/35 pl-5"
                      >
                        {item.children?.map((child) => (
                          <Link
                            key={child.href}
                            href={withLocale(locale, child.href)}
                            onClick={() => setIsMenuOpen(false)}
                            className="grid min-h-[52px] gap-1 py-2 font-body text-[12px] font-semibold uppercase tracking-[0.16em] text-subtext transition duration-300 ease-brand hover:text-primary focus-visible:text-accent focus-visible:outline-none"
                          >
                            <span>{navText(`items.${child.id}`)}</span>
                            {details ? (
                              <span className="text-[12px] font-normal normal-case leading-5 tracking-normal text-subtext/80">
                                {details.descriptions[child.id]}
                              </span>
                            ) : null}
                          </Link>
                        ))}
                      </motion.div>
                    ) : null}
                  </motion.div>
                );
              })}
            </motion.nav>

            <Link
              href={withLocale(locale, '/contact')}
              onClick={() => setIsMenuOpen(false)}
              className="consult-cta consult-cta--accent consult-cta--large mt-10 flex w-full"
            >
              <span className="consult-cta__label">{contactLabel}</span>
            </Link>

            {showExternalHeaderLinks ? (
              <div className="mt-12 border-t border-hairline pt-8">
                <p className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-subtext">
                  {footerText('otherSites')}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-primary">
                  <ExternalSiteLink label={externalText('daeho')} href={externalLinks.daeho} className="site-nav-link no-underline" />
                  <ExternalSiteLink label={externalText('oh')} href={externalLinks.oh} className="site-nav-link no-underline" />
                  <ExternalSiteLink label={externalText('vulcan')} href={externalLinks.vulcan} className="site-nav-link no-underline" />
                </div>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}

function isMegaMenuKey(id: string): id is MegaMenuKey {
  return id === 'legacy' || id === 'specialty';
}
