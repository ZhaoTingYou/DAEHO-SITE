import {getAdminI18n} from '@/lib/admin-i18n';
import {assertAdminCapability} from '@/lib/cms/admin-session';

import {CustomerOperations} from '../../_components/customer-operations';
import {PageHeader} from '../../_components/admin-shell';

export default async function CustomersPage() {
  await assertAdminCapability('users:manage');
  const {locale} = await getAdminI18n();
  return <><PageHeader title={locale === 'zh' ? '会员管理' : locale === 'ko' ? '회원 관리' : 'Customer management'} description={locale === 'zh' ? '查询会员、查看认证状态，并停用或恢复账号。短信验证码由 SOLAPI 自动发送。' : locale === 'ko' ? '회원을 검색하고 인증 상태를 확인하며 계정을 정지하거나 복구합니다. 인증 문자는 SOLAPI가 자동 발송합니다.' : 'Search verified customers and suspend or restore access. Verification SMS is sent automatically through SOLAPI.'} /><CustomerOperations locale={locale} /></>;
}
