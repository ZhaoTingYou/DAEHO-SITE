import Link from 'next/link';

import {
  listCollections,
  listInquiries,
  listMedia,
  listNews,
  listPages
} from '@/lib/cms/repositories';
import {getCmsStatus} from '@/lib/cms/status';

import {PageHeader, Panel} from '../_components/admin-shell';

export default function AdminOverviewPage() {
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
        title="Overview"
        description="Company-only CMS workspace for content, media, and inquiry operations."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="New inquiries" value={newInquiries} href="/admin/inquiries?status=new" />
        <Metric label="Total inquiries" value={inquiries.length} href="/admin/inquiries" />
        <Metric label="News" value={news.length} href="/admin/news" />
        <Metric label="Collections" value={collections.length} href="/admin/collections" />
        <Metric label="Media assets" value={media.length} href="/admin/media" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="border-b border-[#e4e7ec] px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">Latest inquiries</h2>
          </div>
          <div className="divide-y divide-[#e4e7ec]">
            {inquiries.slice(0, 6).map((item) => (
              <Link key={item.id} href={`/admin/inquiries/${item.id}`} className="grid gap-1 px-5 py-4 transition hover:bg-[#f8fafc]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-[#101827]">{item.name}</p>
                  <span className="rounded-full bg-[#eef2f6] px-2 py-1 text-xs font-semibold text-[#475467]">
                    {item.source} / {item.status}
                  </span>
                </div>
                <p className="text-sm text-[#647084]">{item.contact}</p>
              </Link>
            ))}
            {inquiries.length === 0 ? <p className="px-5 py-8 text-sm text-[#647084]">No inquiries yet.</p> : null}
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel>
            <div className="border-b border-[#e4e7ec] px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">Content inventory</h2>
            </div>
            <div className="grid gap-3 p-5">
              <InventoryRow label="Editable page groups" value={pages.length} href="/admin/pages" />
              <InventoryRow label="Visible news items" value={news.filter((item) => item.isVisible).length} href="/admin/news" />
              <InventoryRow label="Visible collections" value={collections.filter((item) => item.isVisible).length} href="/admin/collections" />
              <InventoryRow label="Public image records" value={media.filter((item) => item.storageProvider === 'public').length} href="/admin/media" />
            </div>
          </Panel>

          <Panel>
            <div className="border-b border-[#e4e7ec] px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">CMS health</h2>
            </div>
            <div className="grid gap-3 p-5">
              <StatusRow label="Database" value={formatPersistence(cmsStatus.environment.persistence)} tone={cmsStatus.environment.persistence === 'ephemeral' ? 'warning' : 'ok'} />
              <StatusRow label="DB path" value={cmsStatus.database.path} mono />
              <StatusRow label="Rows tracked" value={tableTotal.toString()} />
              <StatusRow label="Email notify" value={cmsStatus.email.configured ? 'Configured' : 'Not configured'} tone={cmsStatus.email.configured ? 'ok' : 'warning'} />
              <StatusRow label="Latest inquiry" value={cmsStatus.latest.inquiryCreatedAt || 'None'} mono />
              <StatusRow label="Latest email event" value={cmsStatus.latest.emailEventCreatedAt || 'None'} mono />
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

function formatPersistence(value: string) {
  if (value === 'configured') {
    return 'Persistent path configured';
  }

  if (value === 'ephemeral') {
    return 'Ephemeral Vercel filesystem';
  }

  if (value === 'local') {
    return 'Local data directory';
  }

  return value || 'Unknown';
}
