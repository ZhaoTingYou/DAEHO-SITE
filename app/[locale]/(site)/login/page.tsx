import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {connection} from 'next/server';

import {accountsEnabled} from '@/lib/customer/server';
import {isLocale} from '@/lib/locales';

export const metadata: Metadata = {title: 'DAEHO Login', robots: {index: false, follow: false}};
export const dynamic = 'force-dynamic';

export default async function LoginPage({params, searchParams}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{error?: string}>;
}) {
  await connection();
  const {locale} = await params;
  const {error} = await searchParams;
  if (!isLocale(locale)) notFound();
  const ko = locale === 'ko';
  const returnTo = `/${locale}/my-daeho`;
  const errorMessage = error === 'username'
    ? (ko
        ? '아이디는 영문자로 시작하고 4~24자로 입력해 주세요.'
        : 'Enter a valid username with 4–24 characters, starting with a letter.')
    : (ko ? '로그인을 완료하지 못했습니다. 다시 시도해 주세요.' : 'Sign-in could not be completed. Please try again.');
  return (
    <main className="min-h-screen bg-[#f6f1e7] px-container pb-20 pt-28 text-primary md:pt-36">
      <div className="mx-auto grid min-h-[min(760px,calc(100vh-9rem))] max-w-6xl overflow-hidden border border-primary/15 bg-white shadow-[0_28px_80px_rgba(16,29,48,0.12)] md:grid-cols-[0.9fr_1.1fr]">
        <section className="relative flex min-h-72 flex-col justify-between overflow-hidden bg-primary p-8 text-white md:min-h-full md:p-12">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" aria-hidden="true" />
          <div className="absolute -bottom-36 -left-28 h-80 w-80 rounded-full border border-[#d5ad62]/25" aria-hidden="true" />
          <div className="relative">
            <p className="font-heading text-2xl font-semibold tracking-[0.18em]">DAEHO</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#e4c177]">Private customer access</p>
          </div>
          <div className="relative mt-16 max-w-sm md:mt-0">
            <p className="font-heading text-4xl font-semibold leading-tight md:text-5xl">MY DAEHO</p>
            <p className="mt-5 text-sm leading-7 text-white/70">
              {ko ? '문의 진행 상황과 고객 정보를 안전하게 한곳에서 확인하세요.' : 'Securely follow inquiries and manage your customer profile in one place.'}
            </p>
          </div>
        </section>

        <section className="flex items-center px-7 py-12 md:px-16 md:py-20">
          <div className="w-full max-w-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Account sign in</p>
            <h1 className="mt-4 font-heading text-4xl font-semibold md:text-5xl">{ko ? '로그인' : 'Sign in'}</h1>
            <p className="mt-5 text-sm leading-7 text-subtext">
              {ko ? '가입할 때 정한 아이디를 입력한 뒤 안전한 Cognito 로그인으로 이동합니다.' : 'Enter the username you chose during registration, then continue to secure Cognito sign-in.'}
            </p>

            {error ? <p role="alert" className="mt-6 border-l-2 border-accent bg-[#faf6ef] px-4 py-3 text-sm leading-6 text-primary">{errorMessage}</p> : null}

            {await accountsEnabled() ? (
              <div className="mt-9">
                <form action="/api/auth/login" method="post" className="space-y-6">
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <label className="block space-y-2 text-sm font-semibold text-primary">
                    <span>{ko ? '아이디' : 'Username'}</span>
                    <input
                      name="loginHint"
                      type="text"
                      autoComplete="username"
                      minLength={4}
                      maxLength={24}
                      pattern="[A-Za-z][A-Za-z0-9._-]{3,23}"
                      required
                      className="min-h-13 w-full border-b border-primary/30 bg-transparent py-3 text-base font-normal lowercase outline-none transition focus:border-accent"
                      placeholder={ko ? '가입 시 설정한 아이디' : 'Your username'}
                    />
                  </label>
                  <button className="consult-cta consult-cta--accent w-full justify-center">
                    <span className="consult-cta__label">{ko ? '비밀번호 입력하기' : 'Continue to password'}</span>
                  </button>
                </form>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-6 text-sm">
                  <span className="text-subtext">{ko ? '아직 계정이 없으신가요?' : 'New to DAEHO?'}</span>
                  <Link className="font-semibold text-accent underline underline-offset-4" href={`/${locale}/register`}>
                    {ko ? '새 계정 만들기' : 'Create an account'}
                  </Link>
                </div>
              </div>
            ) : <p className="mt-8">{ko ? '회원 기능은 현재 준비 중입니다.' : 'Customer accounts are being prepared.'}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
