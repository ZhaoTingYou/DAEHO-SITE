import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {connection} from 'next/server';

import {RecoverUsernameForm} from '@/components/customer/recover-username-form';
import {getAccountMessages} from '@/lib/customer/messages';
import {accountsEnabled} from '@/lib/customer/server';
import {isLocale} from '@/lib/locales';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  if (!isLocale(locale)) return {};
  return {title: (await getAccountMessages(locale)).recoverUsername.metadataTitle,
    robots: {index: false, follow: false}};
}

export default async function RecoverUsernamePage({params}: {params: Promise<{locale: string}>}) {
  await connection();
  const {locale} = await params;
  if (!isLocale(locale)) notFound();
  const copy = (await getAccountMessages(locale)).recoverUsername;
  return (
    <main className="min-h-screen bg-bg px-container pb-24 pt-36 text-primary md:pt-44">
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{copy.eyebrow}</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold md:text-5xl">{copy.title}</h1>
        <p className="mt-5 text-base leading-7 text-subtext">{copy.intro}</p>
        <div className="mt-10 border-t border-hairline pt-8">
          {await accountsEnabled() ? <RecoverUsernameForm locale={locale} copy={copy} /> : (
            <p className="border-l-2 border-accent px-4 py-3 text-sm leading-6">{copy.unavailable}</p>
          )}
        </div>
      </div>
    </main>
  );
}
