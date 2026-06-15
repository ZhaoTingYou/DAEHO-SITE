import {assertAdminSession} from '@/lib/cms/admin-session';

import {AdminShell} from '../_components/admin-shell';

export default async function AdminDashboardLayout({children}: {children: React.ReactNode}) {
  await assertAdminSession();

  return <AdminShell>{children}</AdminShell>;
}
