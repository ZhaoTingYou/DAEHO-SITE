import type {Locale} from '@/i18n/routing';

export type NavItem = {
  id: string;
  label: string;
  href: string;
  children?: NavItem[];
};

export const navItems: NavItem[] = [
  {id: 'home', label: 'HOME', href: '/'},
  {id: 'chronicle', label: 'ARCHIVE', href: '/archive'},
  {
    id: 'legacy',
    label: 'HERITAGE',
    href: '/heritage',
    children: [
      {id: 'loyalty', label: 'LOYALTY', href: '/heritage/loyalty'},
      {id: 'credibility', label: 'CREDIBILITY', href: '/heritage/credibility'},
      {id: 'achievement', label: 'ACHIEVEMENT', href: '/heritage/achievement'}
    ]
  },
  {
    id: 'specialty',
    label: 'MASTERY',
    href: '/mastery',
    children: [
      {id: 'technique', label: 'MAKING', href: '/mastery/making'},
      {id: 'collection', label: 'CREATIONS', href: '/mastery/creations'}
    ]
  },
  {id: 'news', label: 'NEWS', href: '/news'},
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
