import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {connection} from 'next/server';

import {MyDaehoDashboard} from '@/components/customer/my-daeho-dashboard';
import {accountsEnabled} from '@/lib/customer/server';
import {isLocale} from '@/lib/locales';

export const metadata: Metadata = {title: 'MY DAEHO', robots: {index: false, follow: false}};
export const dynamic = 'force-dynamic';

export default async function MyDaehoPage({params}: {params: Promise<{locale: string}>}) {
  await connection();
  const {locale} = await params;
  if (!isLocale(locale) || !(await accountsEnabled())) notFound();
  return (
    <main className="min-h-screen bg-bg px-container pb-28 pt-36 text-primary md:pt-44">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Customer account</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold md:text-6xl">MY DAEHO</h1>
        <div className="mt-12"><MyDaehoDashboard locale={locale} /></div>
      </div>
    </main>
  );
}
