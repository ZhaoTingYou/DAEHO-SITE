import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {connection} from 'next/server';

import {LoginForm} from '@/components/customer/login-form';
import {sanitizeReturnTo} from '@/lib/customer/auth-cookie-core.mjs';
import {normalizeLoginName} from '@/lib/customer/auth-ui-core.mjs';
import {getAccountMessages} from '@/lib/customer/messages';
import {accountsEnabled} from '@/lib/customer/server';
import {isLocale} from '@/lib/locales';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  if (!isLocale(locale)) return {};
  return {title: (await getAccountMessages(locale)).login.metadataTitle, robots: {index: false, follow: false}};
}

export default async function LoginPage({params, searchParams}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{error?: string; registered?: string; username?: string; returnTo?: string}>;
}) {
  await connection();
  const {locale} = await params;
  const {error, registered, username, returnTo: requestedReturnTo} = await searchParams;
  if (!isLocale(locale)) notFound();
  const copy = (await getAccountMessages(locale)).login;
  const returnTo = sanitizeReturnTo(requestedReturnTo, `/${locale}/my-daeho`);
  const errorMessage = error === 'username' ? copy.errors.username : copy.errors.generic;
  return (
    <main className="min-h-screen bg-[#f6f1e7] px-container pb-20 pt-28 text-primary md:pt-36">
      <div className="mx-auto grid min-h-[min(760px,calc(100vh-9rem))] max-w-6xl overflow-hidden border border-primary/15 bg-white shadow-[0_28px_80px_rgba(16,29,48,0.12)] md:grid-cols-[0.9fr_1.1fr]">
        <section className="relative flex min-h-72 flex-col justify-between overflow-hidden bg-primary p-8 text-white md:min-h-full md:p-12">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" aria-hidden="true" />
          <div className="absolute -bottom-36 -left-28 h-80 w-80 rounded-full border border-[#d5ad62]/25" aria-hidden="true" />
          <div className="relative">
            <p className="font-heading text-2xl font-semibold tracking-[0.18em]">{copy.brandName}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#e4c177]">{copy.brandEyebrow}</p>
          </div>
          <div className="relative mt-16 max-w-sm md:mt-0">
            <p className="font-heading text-4xl font-semibold leading-tight md:text-5xl">{copy.brandTitle}</p>
            <p className="mt-5 text-sm leading-7 text-white/70">{copy.brandBody}</p>
          </div>
        </section>

        <section className="flex items-center px-7 py-12 md:px-16 md:py-20">
          <div className="w-full max-w-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{copy.eyebrow}</p>
            <h1 className="mt-4 font-heading text-4xl font-semibold md:text-5xl">{copy.title}</h1>
            <p className="mt-5 text-sm leading-7 text-subtext">{copy.intro}</p>

            {error ? <p role="alert" className="mt-6 border-l-2 border-accent bg-[#faf6ef] px-4 py-3 text-sm leading-6 text-primary">{errorMessage}</p> : null}

            {await accountsEnabled() ? <LoginForm
              locale={locale}
              copy={copy}
              initialUsername={normalizeLoginName(username)}
              returnTo={returnTo}
              registered={registered === 'true'}
            /> : <p className="mt-8">{copy.unavailable}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
