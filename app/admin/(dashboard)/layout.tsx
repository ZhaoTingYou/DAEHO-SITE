import {assertAdminSession} from '@/lib/cms/admin-session';
import {getAdminI18n} from '@/lib/admin-i18n';

import {AdminShell} from '../_components/admin-shell';

export default async function AdminDashboardLayout({children}: {children: React.ReactNode}) {
  await assertAdminSession();
  const {locale, t} = await getAdminI18n();

  return <AdminShell adminLocale={locale} t={t}>{children}</AdminShell>;
}
