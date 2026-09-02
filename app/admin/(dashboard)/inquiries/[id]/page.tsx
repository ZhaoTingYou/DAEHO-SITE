import Link from 'next/link';
import {notFound} from 'next/navigation';

import {getAdminI18n} from '@/lib/admin-i18n';
import {assertAdminCapability} from '@/lib/cms/admin-session';
import {statusLabel} from '@/lib/cms/inquiry-status-label';
import {inquiryStatusOptions} from '@/lib/cms/inquiry-statuses';
import {
  getInquiryDetail,
  listInquiryStatuses
} from '@/lib/cms/repositories';
import {customerServiceHeaders} from '@/lib/customer/server';
import type {CustomerProfile} from '@/lib/customer/types';

import {PageHeader, Panel} from '../../../_components/admin-shell';
import {InquiryStatusBadge, InquiryStatusControl} from '../../../_components/inquiry-status-control';
import {NotificationTimeline} from '../../../_components/notification-timeline';

type Props = {
  params: Promise<{id: string}>;
};

export default async function AdminInquiryDetailPage({params}: Props) {
  await assertAdminCapability('inquiries:read');
  const {locale, t} = await getAdminI18n();
  const {id} = await params;
  const [detail, statusDefinitions] = await Promise.all([
    getInquiryDetail(id),
    listInquiryStatuses()
  ]);

  if (!detail) {
    notFound();
  }

  const {inquiry, statusEvents, notificationJobs, notificationAttempts} = detail;
  const statuses = inquiryStatusOptions(statusDefinitions, locale);
  const linkedCustomer = inquiry.customerId ? await getLinkedCustomer(inquiry.customerId) : null;
  const statusCopy = inquiryStatusCopy(t);

  return (
    <>
      <PageHeader
        title={t('inquiry.detailTitle')}
        description={t('inquiry.detailDescription')}
        action={
          <Link href="/admin/inquiries" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
            {t('inquiry.back')}
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.72fr_0.28fr]">
        <div className="grid gap-6">
          <Panel className="p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-[#e4e7ec] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#647084]">
                  {t(`source.${inquiry.source}`)}
                </p>
                <h2 className="mt-2 font-heading text-[28px] font-semibold text-[#101827]">{inquiry.name}</h2>
              </div>
              <InquiryStatusBadge
                inquiryId={inquiry.id}
                initialStatus={inquiry.status}
                statuses={statuses}
              />
            </div>
            <dl className="grid gap-4 md:grid-cols-2">
              <DetailItem label={t('inquiry.contact')} value={inquiry.phone || inquiry.contact || '-'} />
              <DetailItem label={t('inquiry.email')} value={inquiry.email || '-'} />
              <DetailItem label={t('inquiry.locale')} value={inquiry.locale.toUpperCase()} />
              <DetailItem label={t('inquiry.organization')} value={inquiry.organization || '-'} />
              <DetailItem label={t('inquiry.type')} value={inquiry.inquiryType || '-'} />
              <DetailItem label={t('inquiry.team')} value={inquiry.team || '-'} />
              <DetailItem label={t('inquiry.quantity')} value={inquiry.quantity?.toString() ?? '-'} />
              <DetailItem label={t('inquiry.due')} value={inquiry.dueDate || '-'} />
              <DetailItem label={t('inquiry.use')} value={inquiry.useCase || '-'} />
              <DetailItem label="Customer ID" value={inquiry.customerId || '-'} />
              <DetailItem label="Link source" value={inquiry.linkSource || '-'} />
              <DetailItem label="Verification" value={linkedCustomer?.verificationMethod || '-'} />
              <DetailItem label="Verified at" value={linkedCustomer ? formatDate(linkedCustomer.verifiedAt) : '-'} />
              <DetailItem label={t('inquiry.pagePath')} value={inquiry.pagePath || '-'} />
              <DetailItem label={t('common.created')} value={formatDate(inquiry.createdAt)} />
            </dl>
            <div className="mt-5 border-t border-[#e4e7ec] pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#647084]">{t('inquiry.message')}</p>
              <p className="mt-2 whitespace-pre-wrap rounded-md bg-[#f8fafc] p-4 text-sm leading-7 text-[#344054]">
                {inquiry.message || t('inquiry.noMessage')}
              </p>
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="mb-4 border-b border-[#e4e7ec] pb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">
              {t('inquiry.configuration')}
            </h2>
            <pre className="overflow-x-auto rounded-md bg-[#101827] p-4 text-xs leading-6 text-white">
              {JSON.stringify(inquiry.configuration, null, 2)}
            </pre>
          </Panel>

          <Panel className="p-5">
            <h2 className="mb-4 border-b border-[#e4e7ec] pb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">
              {t('inquiry.metadata')}
            </h2>
            <dl className="grid gap-4">
              <DetailItem label={t('inquiry.ipAddress')} value={inquiry.ipAddress || '-'} />
              <DetailItem label={t('inquiry.userAgent')} value={inquiry.userAgent || '-'} />
              <DetailItem label={t('inquiry.id')} value={inquiry.id} />
            </dl>
          </Panel>
        </div>

        <aside className="grid h-fit gap-6">
          <Panel className="p-5">
            <h2 className="mb-4 border-b border-[#e4e7ec] pb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">
              {t('inquiry.workflow')}
            </h2>
            <InquiryStatusControl
              inquiryId={inquiry.id}
              initialStatus={inquiry.status}
              statuses={statuses}
              copy={statusCopy}
            />
          </Panel>

          <Panel className="overflow-hidden">
            <div className="border-b border-[#e4e7ec] px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{t('inquiry.statusHistory')}</h2>
            </div>
            {statusEvents.length === 0 ? (
              <p className="px-5 py-8 text-sm text-[#647084]">{t('inquiry.noStatusHistory')}</p>
            ) : (
              <ol className="divide-y divide-[#e4e7ec]">
                {statusEvents.map((event) => (
                  <li key={event.id} className="px-5 py-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#101827]">
                      <span>{statusLabel(statuses, event.previousStatus)}</span>
                      <span aria-hidden="true">→</span>
                      <span className="text-[#7a2230]">{statusLabel(statuses, event.nextStatus)}</span>
                    </div>
                    <p className="mt-1 font-numeric text-xs text-[#98a2b3]">{formatDate(event.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel className="overflow-hidden">
            <div className="border-b border-[#e4e7ec] px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{t('inquiry.notificationHistory')}</h2>
            </div>
            <NotificationTimeline
              initialJobs={notificationJobs}
              attempts={notificationAttempts}
              copy={{
                empty: t('inquiry.noNotification'),
                retry: t('inquiry.retry'),
                retrying: t('inquiry.retrying'),
                attempts: t('inquiry.attempts'),
                recipient: t('inquiry.recipient'),
                error: t('inquiry.retryError')
              }}
            />
          </Panel>
        </aside>
      </div>
    </>
  );
}

async function getLinkedCustomer(customerId: string) {
  const baseUrl = process.env.CUSTOMER_BACKEND_URL?.replace(/\/+$/, '');
  if (!baseUrl) return null;
  const response = await fetch(
    `${baseUrl}/v1/internal/admin/customers?query=${encodeURIComponent(customerId)}&limit=1`,
    {headers: customerServiceHeaders(), cache: 'no-store', signal: AbortSignal.timeout(8_000)}
  ).catch(() => null);
  if (!response?.ok) return null;
  return ((await response.json()) as CustomerProfile[])[0] ?? null;
}

function DetailItem({label, value}: {label: string; value: string}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#647084]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-[#101827]">{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul'
  }).format(new Date(value));
}

function inquiryStatusCopy(t: (key: string) => string) {
  return {
    update: t('inquiry.updateStatus'),
    previewTitle: t('inquiry.previewTitle'),
    previewDescription: t('inquiry.previewDescription'),
    previousStatus: t('inquiry.previousStatus'),
    nextStatus: t('inquiry.nextStatus'),
    notifications: t('inquiry.notifications'),
    noNotification: t('inquiry.noNotification'),
    disabled: t('inquiry.notificationDisabled'),
    ready: t('inquiry.notificationReady'),
    cancel: t('common.cancel'),
    confirm: t('inquiry.confirmChange'),
    saving: t('inquiry.saving'),
    error: t('inquiry.updateError')
  };
}
