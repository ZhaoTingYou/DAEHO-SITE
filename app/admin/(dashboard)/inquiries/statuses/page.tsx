import Link from 'next/link';

import {getAdminI18n} from '@/lib/admin-i18n';
import {assertAdminCapability} from '@/lib/cms/admin-session';
import {listInquiryStatuses} from '@/lib/cms/repositories';

import {PageHeader} from '../../../_components/admin-shell';
import {InquiryStatusManager} from '../../../_components/inquiry-status-manager';

export default async function AdminInquiryStatusesPage() {
  await assertAdminCapability('inquiries:read');
  const {t} = await getAdminI18n();
  const statuses = await listInquiryStatuses();

  return (
    <>
      <PageHeader
        title={t('inquiry.statusesTitle')}
        description={t('inquiry.statusesDescription')}
        action={
          <Link
            href="/admin/inquiries"
            className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] hover:bg-[#f8fafc]"
          >
            {t('inquiry.back')}
          </Link>
        }
      />
      <InquiryStatusManager
        initialStatuses={statuses}
        copy={{
          addStatus: t('inquiry.addStatus'),
          code: t('inquiry.statusCode'),
          codeHint: t('inquiry.statusCodeHint'),
          labelKo: t('inquiry.statusLabelKo'),
          labelEn: t('inquiry.statusLabelEn'),
          labelZh: t('inquiry.statusLabelZh'),
          color: t('inquiry.statusColor'),
          colorLabels: {
            slate: t('inquiry.statusColor.slate'),
            blue: t('inquiry.statusColor.blue'),
            amber: t('inquiry.statusColor.amber'),
            green: t('inquiry.statusColor.green'),
            red: t('inquiry.statusColor.red'),
            purple: t('inquiry.statusColor.purple')
          },
          sortOrder: t('common.sortOrder'),
          active: t('inquiry.statusActive'),
          system: t('inquiry.statusSystem'),
          custom: t('inquiry.statusCustom'),
          save: t('inquiry.saveStatus'),
          create: t('inquiry.createStatus'),
          saving: t('inquiry.saving'),
          saved: t('inquiry.statusSaved'),
          created: t('inquiry.statusCreated'),
          error: t('inquiry.statusError'),
          notificationNote: t('inquiry.statusNotificationNote')
        }}
      />
    </>
  );
}
