import Link from 'next/link';

import {getAdminI18n} from '@/lib/admin-i18n';
import {
  listCollections,
  listInquiries,
  listMedia,
  listNews,
  listPages
} from '@/lib/cms/repositories';
import {managedPageDefinitions} from '@/lib/cms/page-catalog';
import {getCmsStatus} from '@/lib/cms/status';

import {PageHeader, Panel} from '../_components/admin-shell';

export default async function AdminOverviewPage() {
  const {t} = await getAdminI18n();
  const inquiries = listInquiries({});
  const news = listNews();
  const collections = listCollections();
  const media = listMedia();
  const pages = listPages();
  const cmsStatus = getCmsStatus();
  const newInquiries = inquiries.filter((item) => item.status === 'new').length;
  const tableTotal = cmsStatus.tables.reduce((total, table) => total + table.count, 0);

  return (
    <>
      <PageHeader
        title={t('overview.title')}
        description={t('overview.description')}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label={t('overview.metricNewInquiries')} value={newInquiries} href="/admin/inquiries?status=new" />
        <Metric label={t('overview.metricTotalInquiries')} value={inquiries.length} href="/admin/inquiries" />
        <Metric label={t('overview.metricNews')} value={news.length} href="/admin/news" />
        <Metric label={t('overview.metricCollections')} value={collections.length} href="/admin/collections" />
        <Metric label={t('overview.metricMedia')} value={media.length} href="/admin/media" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="border-b border-[#e4e7ec] px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{t('overview.latestInquiries')}</h2>
          </div>
          <div className="divide-y divide-[#e4e7ec]">
            {inquiries.slice(0, 6).map((item) => (
              <Link key={item.id} href={`/admin/inquiries/${item.id}`} className="grid gap-1 px-5 py-4 transition hover:bg-[#f8fafc]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-[#101827]">{item.name}</p>
                  <span className="rounded-full bg-[#eef2f6] px-2 py-1 text-xs font-semibold text-[#475467]">
                    {t(`source.${item.source}`)} / {t(`status.${item.status}`)}
                  </span>
                </div>
                <p className="text-sm text-[#647084]">{item.contact}</p>
              </Link>
            ))}
            {inquiries.length === 0 ? <p className="px-5 py-8 text-sm text-[#647084]">{t('overview.noInquiries')}</p> : null}
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel>
            <div className="border-b border-[#e4e7ec] px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{t('overview.contentInventory')}</h2>
            </div>
            <div className="grid gap-3 p-5">
              <InventoryRow label={t('overview.editablePageGroups')} value={managedPageDefinitions.length || pages.length} href="/admin/pages" />
              <InventoryRow label={t('overview.visibleNewsItems')} value={news.filter((item) => item.isVisible).length} href="/admin/news" />
              <InventoryRow label={t('overview.visibleCollections')} value={collections.filter((item) => item.isVisible).length} href="/admin/collections" />
              <InventoryRow label={t('overview.publicImageRecords')} value={media.filter((item) => item.storageProvider === 'public').length} href="/admin/media" />
            </div>
          </Panel>

          <Panel>
            <div className="border-b border-[#e4e7ec] px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{t('overview.cmsHealth')}</h2>
            </div>
            <div className="grid gap-3 p-5">
              <StatusRow label={t('overview.database')} value={formatPersistence(cmsStatus.environment.persistence, t)} tone={cmsStatus.environment.persistence === 'ephemeral' ? 'warning' : 'ok'} />
              <StatusRow label={t('overview.dbPath')} value={cmsStatus.database.path} mono />
              <StatusRow label={t('overview.rowsTracked')} value={tableTotal.toString()} />
              <StatusRow label={t('overview.emailNotify')} value={cmsStatus.email.configured ? t('overview.configured') : t('overview.notConfigured')} tone={cmsStatus.email.configured ? 'ok' : 'warning'} />
              <StatusRow label={t('overview.latestInquiry')} value={cmsStatus.latest.inquiryCreatedAt || t('common.none')} mono />
              <StatusRow label={t('overview.latestEmailEvent')} value={cmsStatus.latest.emailEventCreatedAt || t('common.none')} mono />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Metric({label, value, href}: {label: string; value: number; href: string}) {
  return (
    <Link href={href} className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#647084]">{label}</p>
      <p className="mt-4 font-numeric text-4xl font-semibold text-[#101827]">{value}</p>
    </Link>
  );
}

function InventoryRow({label, value, href}: {label: string; value: number; href: string}) {
  return (
    <Link href={href} className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-[#e4e7ec] px-3 py-2 transition hover:bg-[#f8fafc]">
      <span className="text-sm font-semibold text-[#344054]">{label}</span>
      <span className="font-numeric text-sm font-semibold text-[#101827]">{value}</span>
    </Link>
  );
}

function StatusRow({
  label,
  value,
  mono = false,
  tone = 'neutral'
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'neutral' | 'ok' | 'warning';
}) {
  const toneClass =
    tone === 'ok'
      ? 'bg-[#ecfdf3] text-[#027a48]'
      : tone === 'warning'
        ? 'bg-[#fffaeb] text-[#b54708]'
        : 'bg-[#f2f4f7] text-[#344054]';

  return (
    <div className="grid gap-2 rounded-md border border-[#e4e7ec] px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#647084]">{label}</span>
      <span className={`break-words rounded px-2 py-1 text-sm font-semibold ${toneClass} ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function formatPersistence(value: string, t: (key: string) => string) {
  if (value === 'configured') {
    return t('overview.persistenceConfigured');
  }

  if (value === 'ephemeral') {
    return t('overview.persistenceEphemeral');
  }

  if (value === 'local') {
    return t('overview.persistenceLocal');
  }

  return value || t('common.none');
}
