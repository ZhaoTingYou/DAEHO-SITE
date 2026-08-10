import {PageHeader} from '@/app/admin/_components/admin-shell';
import {AdminUsersManager} from '@/app/admin/_components/admin-users-manager';
import {getAdminI18n} from '@/lib/admin-i18n';
import {assertAdminCapability} from '@/lib/cms/admin-session';
import {listAdminUsers} from '@/lib/cms/admin-users';

export default async function AdminUsersPage() {
  const identity = await assertAdminCapability('users:manage');
  const [{messages, t}, users] = await Promise.all([
    getAdminI18n(),
    listAdminUsers(identity)
  ]);

  return (
    <>
      <PageHeader title={t('users.title')} description={t('users.description')} />
      <AdminUsersManager initialUsers={users} messages={messages} />
    </>
  );
}
