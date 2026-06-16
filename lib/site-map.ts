import type {Locale} from '@/i18n/routing';

export type NavItem = {
  id: string;
  label: string;
  href: string;
  children?: NavItem[];
};

export const navItems: NavItem[] = [
  {id: 'home', label: 'HOME', href: '/'},
  {id: 'chronicle', label: 'ARCHIVE', href: '/chronicle'},
  {
    id: 'legacy',
    label: 'HERITAGE',
    href: '/legacy',
    children: [
      {id: 'loyalty', label: 'LOYALTY', href: '/legacy/loyalty'},
      {id: 'credibility', label: 'CREDIBILITY', href: '/legacy/credibility'},
      {id: 'achievement', label: 'ACHIEVEMENT', href: '/legacy/achievement'}
    ]
  },
  {
    id: 'specialty',
    label: 'MASTERY',
    href: '/specialty',
    children: [
      {id: 'technique', label: 'MAKING', href: '/specialty/technique'},
      {id: 'collection', label: 'CREATIONS', href: '/specialty/collection'}
    ]
  },
  {id: 'news', label: 'JOURNAL', href: '/news'},
  {id: 'golf', label: 'GOLF', href: '/golf'}
];

export function withLocale(locale: Locale | string, href: string) {
  return `/${locale}${href === '/' ? '' : href}`;
}

export function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/' || pathname === '';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
