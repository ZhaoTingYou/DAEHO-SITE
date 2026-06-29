import {changeAdminPasswordAction} from '@/app/admin/actions';
import {SubmitButton, TextField} from '@/app/admin/_components/admin-fields';
import {PageHeader, Panel} from '@/app/admin/_components/admin-shell';
import {getAdminI18n} from '@/lib/admin-i18n';

type Props = {
  searchParams?: Promise<{error?: string; status?: string}>;
};

export default async function AdminAccountPage({searchParams}: Props) {
  const {t} = await getAdminI18n();
  const query = await searchParams;
  const message = accountMessage(query?.error, query?.status, t);

  return (
    <>
      <PageHeader title={t('account.title')} description={t('account.description')} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(280px,0.4fr)]">
        <Panel>
          <form action={changeAdminPasswordAction} className="grid gap-5 p-5">
            {message ? (
              <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${message.tone === 'ok' ? 'border-[#abefc6] bg-[#ecfdf3] text-[#027a48]' : 'border-[#fecdca] bg-[#fff5f5] text-[#b42318]'}`}>
                {message.text}
              </div>
            ) : null}

            <TextField label={t('account.currentPassword')} name="currentPassword" type="password" required />
            <TextField label={t('account.newPassword')} name="newPassword" type="password" required />
            <TextField label={t('account.confirmPassword')} name="confirmPassword" type="password" required />

            <div>
              <SubmitButton>{t('account.savePassword')}</SubmitButton>
            </div>
          </form>
        </Panel>

        <Panel>
          <div className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{t('account.rulesTitle')}</h2>
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-[#344054]">
              <li>{t('account.ruleLength')}</li>
              <li>{t('account.ruleMix')}</li>
              <li>{t('account.ruleCurrent')}</li>
              <li>{t('account.ruleStorage')}</li>
            </ul>
          </div>
        </Panel>
      </div>
    </>
  );
}

function accountMessage(error: string | undefined, status: string | undefined, t: (key: string) => string) {
  if (status === 'updated') {
    return {tone: 'ok' as const, text: t('account.updated')};
  }

  if (error === 'current') {
    return {tone: 'error' as const, text: t('account.errorCurrent')};
  }

  if (error === 'mismatch') {
    return {tone: 'error' as const, text: t('account.errorMismatch')};
  }

  if (error === 'weak') {
    return {tone: 'error' as const, text: t('account.errorWeak')};
  }

  if (error === 'server') {
    return {tone: 'error' as const, text: t('account.errorServer')};
  }

  return null;
}
