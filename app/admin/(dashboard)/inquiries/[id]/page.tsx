import Link from 'next/link';
import {notFound} from 'next/navigation';

import {getAdminI18n} from '@/lib/admin-i18n';
import {
  getInquiry,
  listEmailEventsForInquiry
} from '@/lib/cms/repositories';

import {
  resendInquiryNotificationAction,
  updateInquiryStatusAction
} from '../../../actions';
import {PageHeader, Panel} from '../../../_components/admin-shell';

type Props = {
  params: Promise<{id: string}>;
};

const statuses = ['new', 'contacted', 'in_progress', 'done', 'spam'];

export default async function AdminInquiryDetailPage({params}: Props) {
  const {t} = await getAdminI18n();
  const {id} = await params;
  const inquiry = getInquiry(id);

  if (!inquiry) {
    notFound();
  }

  const emailEvents = listEmailEventsForInquiry(inquiry.id);

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
              <StatusBadge status={inquiry.status} label={t(`status.${inquiry.status}`)} />
            </div>
            <dl className="grid gap-4 md:grid-cols-2">
              <DetailItem label={t('inquiry.contact')} value={inquiry.contact} />
              <DetailItem label={t('inquiry.locale')} value={inquiry.locale.toUpperCase()} />
              <DetailItem label={t('inquiry.organization')} value={inquiry.organization || '-'} />
              <DetailItem label={t('inquiry.type')} value={inquiry.inquiryType || '-'} />
              <DetailItem label={t('inquiry.team')} value={inquiry.team || '-'} />
              <DetailItem label={t('inquiry.quantity')} value={inquiry.quantity?.toString() ?? '-'} />
              <DetailItem label={t('inquiry.due')} value={inquiry.dueDate || '-'} />
              <DetailItem label={t('inquiry.use')} value={inquiry.useCase || '-'} />
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
            <form action={updateInquiryStatusAction} className="grid gap-3">
              <input type="hidden" name="id" value={inquiry.id} />
              <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
                <span>{t('common.status')}</span>
                <select
                  name="status"
                  defaultValue={inquiry.status}
                  className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#344054]"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {t(`status.${status}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="admin-on-dark min-h-10 rounded-md bg-[#101827] px-4 text-sm font-semibold text-[#ffffff] transition hover:bg-[#7a2230]">
                {t('inquiry.updateStatus')}
              </button>
            </form>
            <form action={resendInquiryNotificationAction} className="mt-3">
              <input type="hidden" name="id" value={inquiry.id} />
              <button className="min-h-10 w-full rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
                {t('inquiry.resendNotification')}
              </button>
            </form>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="border-b border-[#e4e7ec] px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{t('inquiry.emailEvents')}</h2>
            </div>
            {emailEvents.length === 0 ? (
              <p className="px-5 py-8 text-sm text-[#647084]">{t('inquiry.noEmailEvent')}</p>
            ) : (
              <div className="divide-y divide-[#e4e7ec]">
                {emailEvents.map((event) => (
                  <div key={event.id} className="space-y-2 px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <StatusBadge status={event.status} label={t(`status.${event.status}`)} />
                      <span className="font-numeric text-xs text-[#98a2b3]">{formatDate(event.createdAt)}</span>
                    </div>
                    <p className="break-words text-sm font-semibold text-[#101827]">{event.subject || t('inquiry.noSubject')}</p>
                    {event.recipient ? <p className="break-words text-xs text-[#647084]">{event.recipient}</p> : null}
                    {event.providerMessageId ? (
                      <p className="break-words font-numeric text-xs text-[#647084]">{event.providerMessageId}</p>
                    ) : null}
                    {event.errorMessage ? (
                      <p className="break-words rounded-md bg-[#fff5f5] px-3 py-2 text-xs leading-5 text-[#b42318]">
                        {event.errorMessage}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}

function DetailItem({label, value}: {label: string; value: string}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#647084]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-[#101827]">{value}</dd>
    </div>
  );
}

function StatusBadge({status, label}: {status: string; label: string}) {
  const className =
    status === 'sent' || status === 'done'
      ? 'bg-[#ecfdf3] text-[#027a48]'
      : status === 'failed' || status === 'spam'
        ? 'bg-[#fff5f5] text-[#b42318]'
        : status === 'skipped'
          ? 'bg-[#fffaeb] text-[#b54708]'
          : 'bg-[#eef2f6] text-[#475467]';

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul'
  }).format(new Date(value));
}
