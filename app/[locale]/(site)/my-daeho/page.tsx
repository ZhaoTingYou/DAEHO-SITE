import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {connection} from 'next/server';

import {MyDaehoDashboard} from '@/components/customer/my-daeho-dashboard';
import {getAccountMessages} from '@/lib/customer/messages';
import {accountsEnabled} from '@/lib/customer/server';
import {isLocale} from '@/lib/locales';

export const metadata: Metadata = {title: 'MY DAEHO', robots: {index: false, follow: false}};
export const dynamic = 'force-dynamic';

export default async function MyDaehoPage({params}: {params: Promise<{locale: string}>}) {
  await connection();
  const {locale} = await params;
  if (!isLocale(locale) || !(await accountsEnabled())) notFound();
  const copy = (await getAccountMessages(locale)).dashboard;
  return (
    <main className="min-h-screen bg-bg px-container pb-28 pt-36 text-primary md:pt-44">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{copy.eyebrow}</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold md:text-6xl">{copy.title}</h1>
        <div className="mt-12"><MyDaehoDashboard locale={locale} copy={copy} /></div>
      </div>
    </main>
  );
}
