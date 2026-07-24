import Link from 'next/link';

import type {AdminLocale} from '@/lib/admin-locales';

import {logoutAction} from '../actions';
import {AdminLanguageSwitcher} from './admin-language-switcher';

const navItems = [
  {href: '/admin', labelKey: 'nav.overview'},
  {href: '/admin/inquiries', labelKey: 'nav.inquiries'},
  {href: '/admin/news', labelKey: 'nav.news'},
  {href: '/admin/collections', labelKey: 'nav.collections'},
  {href: '/admin/media', labelKey: 'nav.media'},
  {href: '/admin/popup', labelKey: 'nav.popup'},
  {href: '/admin/footer', labelKey: 'nav.footer'},
  {href: '/admin/pages', labelKey: 'nav.pages'},
  {href: '/admin/export', labelKey: 'nav.export'},
  {href: '/admin/analytics', labelKey: 'nav.analytics'},
  {href: '/admin/account', labelKey: 'nav.account'}
];

export function AdminShell({
  children,
  adminLocale,
  t
}: {
  children: React.ReactNode;
  adminLocale: AdminLocale;
  t: (key: string) => string;
}) {
  return (
    <div className="min-h-dvh bg-[#f4f5f7] text-[#182033]">
      <aside className="admin-on-dark fixed inset-y-0 left-0 hidden w-64 border-r border-[#d9dee7] bg-[#101827] px-4 py-5 text-[#ffffff] lg:block">
        <Link href="/admin" className="block border-b border-white/10 pb-5">
          <span className="block font-heading text-[22px] font-semibold tracking-[0.16em]">DAEHO</span>
          <span className="mt-1 block font-body text-xs uppercase tracking-[0.18em] text-white/55">{t('shell.subtitle')}</span>
        </Link>
        <nav className="mt-6 grid gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="min-h-10 rounded-md px-3 py-2 text-sm font-semibold text-[rgba(255,255,255,0.76)] transition hover:bg-white/10 hover:text-[#ffffff]"
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-20 left-4 right-4">
          <AdminLanguageSwitcher activeLocale={adminLocale} label={t('shell.interfaceLanguage')} />
        </div>
        <form action={logoutAction} className="absolute bottom-5 left-4 right-4">
          <button className="min-h-10 w-full rounded-md border border-white/15 px-3 text-sm font-semibold text-[rgba(255,255,255,0.72)] transition hover:bg-white/10 hover:text-[#ffffff]">
            {t('shell.signOut')}
          </button>
        </form>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-[#d9dee7] bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin" className="font-heading text-xl font-semibold tracking-[0.16em]">DAEHO</Link>
            <form action={logoutAction}>
              <button className="min-h-10 rounded-md border border-[#cbd3df] px-3 text-sm font-semibold">
                {t('shell.signOut')}
              </button>
            </form>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-md border border-[#d9dee7] bg-white px-3 py-2 text-xs font-semibold"
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
          <div className="admin-on-dark mt-3 rounded-md bg-[#101827] p-3">
            <AdminLanguageSwitcher activeLocale={adminLocale} label={t('shell.interfaceLanguage')} />
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-[#d9dee7] pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-heading text-[30px] font-semibold leading-tight text-[#101827]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647084]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({children, className = ''}: {children: React.ReactNode; className?: string}) {
  return (
    <section className={`rounded-lg border border-[#d9dee7] bg-white shadow-sm ${className}`}>
      {children}
    </section>
  );
}

export function EmptyState({title, body}: {title: string; body: string}) {
  return (
    <Panel className="px-6 py-12 text-center">
      <p className="font-heading text-2xl font-semibold text-[#101827]">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#647084]">{body}</p>
    </Panel>
  );
}
