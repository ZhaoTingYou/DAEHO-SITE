import {redirect} from 'next/navigation';

import {getAdminPasswordHint, hasAdminSession} from '@/lib/cms/admin-session';

import {loginAction} from '../../actions';

type Props = {
  searchParams?: Promise<{error?: string}>;
};

export default async function AdminLoginPage({searchParams}: Props) {
  if (await hasAdminSession()) {
    redirect('/admin');
  }

  const query = await searchParams;
  const hint = getAdminPasswordHint();

  return (
    <main className="admin-on-dark grid min-h-dvh place-items-center bg-[#101827] px-4 py-10 text-[#ffffff]">
      <section className="w-full max-w-[420px] rounded-lg border border-white/10 bg-white p-6 text-[#182033] shadow-2xl">
        <div className="border-b border-[#e4e7ec] pb-5">
          <p className="font-heading text-[28px] font-semibold tracking-[0.14em] text-[#101827]">DEAHO</p>
          <h1 className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#647084]">CMS Admin</h1>
        </div>
        <form action={loginAction} className="mt-6 grid gap-4">
          <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="min-h-11 rounded-md border border-[#cbd3df] px-3 outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
            />
          </label>
          {query?.error ? (
            <p className="rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-3 py-2 text-sm font-semibold text-[#b42318]">
              Password is incorrect.
            </p>
          ) : null}
          {hint ? <p className="text-xs font-semibold text-[#647084]">{hint}</p> : null}
          <button className="admin-on-dark min-h-11 rounded-md bg-[#7a2230] px-4 text-sm font-semibold text-[#ffffff] transition hover:bg-[#101827]">
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
