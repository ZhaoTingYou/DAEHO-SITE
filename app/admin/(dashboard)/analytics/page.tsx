import Link from 'next/link';

import {getAdminI18n} from '@/lib/admin-i18n';
import type {AdminLocale} from '@/lib/admin-locales';
import {
  getTrafficAnalyticsSummary,
  listTrafficAnalyticsVisits,
  trafficAnalyticsChannels,
  type TrafficAnalyticsChannel,
  type TrafficAnalyticsFilters,
  type TrafficAnalyticsSummary,
  type TrafficAnalyticsVisits
} from '@/lib/cms/repositories';

import {PageHeader, Panel} from '../../_components/admin-shell';

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  searchParams?: Promise<SearchParams>;
};

type AnalyticsPageFilters = TrafficAnalyticsFilters & {
  page: number;
  pageSize: 25;
};

const presetDays = [7, 30, 90];

export default async function AdminAnalyticsPage({searchParams}: Props) {
  const {locale, t} = await getAdminI18n();
  const filters = normalizeAnalyticsFilters(await searchParams, nowInSeoul());
  const [summary, visits] = await Promise.all([
    getTrafficAnalyticsSummary(filters),
    listTrafficAnalyticsVisits(filters)
  ]);

  return (
    <>
      <PageHeader title={t('analytics.title')} description={t('analytics.description')} />

      <Panel className="mb-6 p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#647084]">{t('analytics.dateRange')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {presetDays.map((days) => (
                <DatePresetLink
                  key={days}
                  href={analyticsHref(filters, {from: addDays(filters.to, -(days - 1)), page: 1})}
                  label={datePresetLabel(t, days)}
                  active={dateRangeDays(filters) === days}
                />
              ))}
            </div>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#647084]">{t('analytics.privacyNote')}</p>
        </div>

        <form method="get" className="mt-5 border-t border-[#e4e7ec] pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#647084]">{t('analytics.customDates')}</p>
          <div className="grid gap-3 lg:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(180px,1fr)_auto] lg:items-end">
            <DateField label={t('analytics.from')} name="from" value={filters.from} />
            <DateField label={t('analytics.to')} name="to" value={filters.to} />
            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-[#344054]">
              <span>{t('analytics.channelFilter')}</span>
              <select name="channel" defaultValue={filters.channel ?? ''} className="min-h-10 w-full rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15">
                <option value="">{t('analytics.allChannels')}</option>
                {trafficAnalyticsChannels.map((channel) => (
                  <option key={channel} value={channel}>{channelLabel(t, channel)}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button className="admin-on-dark min-h-10 rounded-md bg-[#7a2230] px-4 text-sm font-semibold text-white transition hover:bg-[#101827]">
                {t('analytics.applyFilters')}
              </button>
              <Link href="/admin/analytics" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f8fafc]">
                {t('analytics.clearFilters')}
              </Link>
            </div>
          </div>
        </form>
      </Panel>

      <Panel className="mb-6 overflow-hidden">
        <div className="grid divide-y divide-[#e4e7ec] sm:grid-cols-2 xl:grid-cols-4 xl:divide-y-0 xl:divide-x">
          <Metric label={t('analytics.metricVisits')} value={formatNumber(summary.totals.sessions, locale)} />
          <Metric label={t('analytics.metricPageViews')} value={formatNumber(summary.totals.pageViews, locale)} />
          <Metric label={t('analytics.metricActiveSessions')} value={formatNumber(summary.totals.activeSessions, locale)} />
          <Metric label={t('analytics.metricPagesPerSession')} value={formatDecimal(summary.totals.averagePagesPerSession, locale)} />
        </div>
      </Panel>

      <Panel className="mb-6 overflow-hidden">
        <SectionTitle title={t('analytics.dailyTraffic')} />
        <DailyTrafficChart daily={summary.daily} locale={locale} t={t} />
      </Panel>

      <Panel className="mb-6 overflow-hidden">
        <SectionTitle title={t('analytics.channels')} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.12em] text-[#647084]">
              <tr>
                <th className="px-4 py-3">{t('analytics.channel')}</th>
                <th className="px-4 py-3">{t('analytics.source')}</th>
                <th className="px-4 py-3">{t('analytics.medium')}</th>
                <th className="px-4 py-3 text-right">{t('analytics.sessions')}</th>
                <th className="px-4 py-3 text-right">{t('analytics.pageViews')}</th>
                <th className="px-4 py-3 text-right">{t('analytics.share')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {summary.channels.length === 0 ? <TableEmpty colSpan={6} body={t('analytics.noChannels')} /> : summary.channels.map((item) => (
                <tr key={`${item.channel}:${item.source}:${item.medium}`}>
                  <td className="px-4 py-3"><ChannelLabel channel={item.channel} t={t} /></td>
                  <td className="px-4 py-3 text-[#475467]">{item.source || '—'}</td>
                  <td className="px-4 py-3 text-[#475467]">{item.medium || '—'}</td>
                  <td className="px-4 py-3 text-right font-numeric font-semibold text-[#101827]">{formatNumber(item.sessions, locale)}</td>
                  <td className="px-4 py-3 text-right font-numeric text-[#475467]">{formatNumber(item.pageViews, locale)}</td>
                  <td className="px-4 py-3 text-right font-numeric text-[#475467]">{formatPercent(item.share, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mb-6 overflow-hidden">
        <SectionTitle title={t('analytics.landingPages')} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.12em] text-[#647084]">
              <tr>
                <th className="px-4 py-3">{t('analytics.path')}</th>
                <th className="px-4 py-3 text-right">{t('analytics.sessions')}</th>
                <th className="px-4 py-3">{t('analytics.leadingChannel')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {summary.landingPages.length === 0 ? <TableEmpty colSpan={3} body={t('analytics.noLandingPages')} /> : summary.landingPages.map((item) => (
                <tr key={item.path}>
                  <td className="max-w-[520px] break-words px-4 py-3 font-mono text-xs text-[#344054]">{item.path}</td>
                  <td className="px-4 py-3 text-right font-numeric font-semibold text-[#101827]">{formatNumber(item.sessions, locale)}</td>
                  <td className="px-4 py-3"><ChannelLabel channel={item.leadingChannel} t={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <SectionTitle title={t('analytics.recentVisits')} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
            <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.12em] text-[#647084]">
              <tr>
                <th className="px-4 py-3">{t('analytics.startedAt')}</th>
                <th className="px-4 py-3">{t('analytics.channel')}</th>
                <th className="px-4 py-3">{t('analytics.source')}</th>
                <th className="px-4 py-3">{t('analytics.landingPages')}</th>
                <th className="px-4 py-3">{t('analytics.latestPath')}</th>
                <th className="px-4 py-3">{t('analytics.locale')}</th>
                <th className="px-4 py-3">{t('analytics.device')}</th>
                <th className="px-4 py-3 text-right">{t('analytics.pages')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {visits.items.length === 0 ? <TableEmpty colSpan={8} body={t('analytics.noVisits')} /> : visits.items.map((item) => (
                <tr key={`${item.startedAt}:${item.landingPath}:${item.latestPath}`} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 font-numeric text-xs text-[#647084]">{formatDateTime(item.startedAt, locale)}</td>
                  <td className="px-4 py-3"><ChannelLabel channel={item.channel} t={t} /></td>
                  <td className="px-4 py-3 text-[#475467]">{item.source || '—'} / {item.medium || '—'}</td>
                  <td className="max-w-[260px] break-words px-4 py-3 font-mono text-xs text-[#344054]">{item.landingPath}</td>
                  <td className="max-w-[260px] break-words px-4 py-3 font-mono text-xs text-[#344054]">{item.latestPath}</td>
                  <td className="px-4 py-3 font-numeric text-xs text-[#475467]">{item.locale.toUpperCase()}</td>
                  <td className="px-4 py-3 text-[#475467]">{item.deviceClass}</td>
                  <td className="px-4 py-3 text-right font-numeric font-semibold text-[#101827]">{formatNumber(item.pageViewCount, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination filters={filters} visits={visits} t={t} />
      </Panel>
    </>
  );
}

function DateField({label, name, value}: {label: string; name: string; value: string}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-[#344054]">
      <span>{label}</span>
      <input name={name} type="date" defaultValue={value} className="min-h-10 w-full rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15" />
    </label>
  );
}

function DatePresetLink({href, label, active}: {href: string; label: string; active: boolean}) {
  return (
    <Link href={href} className={`inline-flex min-h-9 items-center rounded-md border px-3 text-sm font-semibold transition ${active ? 'admin-on-dark border-[#101827] bg-[#101827] text-white' : 'border-[#cbd3df] bg-white text-[#344054] hover:bg-[#f8fafc]'}`}>
      {label}
    </Link>
  );
}

function Metric({label, value}: {label: string; value: string}) {
  return (
    <div className="min-h-[118px] px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#647084]">{label}</p>
      <p className="mt-3 font-numeric text-3xl font-semibold text-[#101827]">{value}</p>
    </div>
  );
}

function SectionTitle({title}: {title: string}) {
  return <div className="border-b border-[#e4e7ec] px-5 py-4"><h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{title}</h2></div>;
}

function DailyTrafficChart({daily, locale, t}: {daily: TrafficAnalyticsSummary['daily']; locale: AdminLocale; t: (key: string, values?: Record<string, string | number>) => string}) {
  if (daily.length === 0) {
    return <p className="px-5 py-10 text-sm text-[#647084]">{t('analytics.noDailyData')}</p>;
  }

  const maximum = Math.max(1, ...daily.flatMap((item) => [item.sessions, item.pageViews]));

  return (
    <div className="p-5">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-[#647084]">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 bg-[#475467]" />{t('analytics.sessions')}</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 bg-[#7a2230]" />{t('analytics.pageViews')}</span>
      </div>
      <div className="overflow-x-auto">
        <div aria-label={t('analytics.dailyChart')} role="img" className="grid h-44 min-w-[620px] grid-flow-col auto-cols-[minmax(12px,1fr)] items-end gap-1 border-b border-[#d9dee7] px-1">
          {daily.map((item) => (
            <div key={item.date} title={`${formatDate(item.date, locale)}: ${t('analytics.sessions')} ${formatNumber(item.sessions, locale)}, ${t('analytics.pageViews')} ${formatNumber(item.pageViews, locale)}`} className="flex h-36 min-w-0 items-end justify-center gap-px">
              <span className="w-1/2 max-w-2 bg-[#475467]" style={{height: `${Math.max(3, item.sessions / maximum * 100)}%`}} />
              <span className="w-1/2 max-w-2 bg-[#7a2230]" style={{height: `${Math.max(3, item.pageViews / maximum * 100)}%`}} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between gap-4 font-numeric text-xs text-[#647084]">
        <span>{formatDate(daily[0].date, locale)}</span>
        <span>{formatDate(daily[daily.length - 1].date, locale)}</span>
      </div>
    </div>
  );
}

function ChannelLabel({channel, t}: {channel: string; t: (key: string) => string}) {
  return <span className="inline-flex rounded-full bg-[#eef2f6] px-2.5 py-1 text-xs font-semibold text-[#475467]">{isTrafficAnalyticsChannel(channel) ? channelLabel(t, channel) : channel || '—'}</span>;
}

function TableEmpty({colSpan, body}: {colSpan: number; body: string}) {
  return <tr><td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-[#647084]">{body}</td></tr>;
}

function Pagination({filters, visits, t}: {filters: AnalyticsPageFilters; visits: TrafficAnalyticsVisits; t: (key: string, values?: Record<string, string | number>) => string}) {
  const totalPages = Math.max(visits.totalPages, 1);

  return (
    <div className="flex flex-col gap-3 border-t border-[#e4e7ec] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-numeric text-sm text-[#647084]">{t('analytics.pageSummary', {page: visits.page, pages: totalPages, total: visits.total})}</p>
      <div className="flex items-center gap-2">
        {filters.page > 1 ? (
          <Link href={analyticsHref(filters, {page: filters.page - 1})} className="inline-flex min-h-9 items-center rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#344054] hover:bg-[#f8fafc]">{t('analytics.previous')}</Link>
        ) : <span aria-disabled="true" className="inline-flex min-h-9 items-center rounded-md border border-[#e4e7ec] bg-[#f8fafc] px-3 text-sm font-semibold text-[#98a2b3]">{t('analytics.previous')}</span>}
        {filters.page < visits.totalPages ? (
          <Link href={analyticsHref(filters, {page: filters.page + 1})} className="inline-flex min-h-9 items-center rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#344054] hover:bg-[#f8fafc]">{t('analytics.next')}</Link>
        ) : <span aria-disabled="true" className="inline-flex min-h-9 items-center rounded-md border border-[#e4e7ec] bg-[#f8fafc] px-3 text-sm font-semibold text-[#98a2b3]">{t('analytics.next')}</span>}
      </div>
    </div>
  );
}

function normalizeAnalyticsFilters(query: SearchParams | undefined, today: string): AnalyticsPageFilters {
  const defaultFrom = addDays(today, -29);
  const from = normalizeDate(firstValue(query?.from)) ?? defaultFrom;
  const to = normalizeDate(firstValue(query?.to)) ?? today;

  return {
    from: from <= to ? from : defaultFrom,
    to: from <= to ? to : today,
    channel: normalizeChannel(firstValue(query?.channel)),
    page: positiveInteger(firstValue(query?.page)) ?? 1,
    pageSize: 25
  };
}

function analyticsHref(filters: AnalyticsPageFilters, updates: Partial<AnalyticsPageFilters> = {}) {
  const next = {...filters, ...updates};
  const params = new URLSearchParams({from: next.from, to: next.to});

  if (next.channel) {
    params.set('channel', next.channel);
  }
  if (next.page > 1) {
    params.set('page', String(next.page));
  }

  return `/admin/analytics?${params.toString()}`;
}

function nowInSeoul() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function normalizeDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? undefined : value;
}

function normalizeChannel(value?: string): TrafficAnalyticsChannel | undefined {
  const channel = value?.trim().toLowerCase();
  return channel && isTrafficAnalyticsChannel(channel) ? channel : undefined;
}

function isTrafficAnalyticsChannel(value: string): value is TrafficAnalyticsChannel {
  return trafficAnalyticsChannels.includes(value as TrafficAnalyticsChannel);
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function dateRangeDays(filters: AnalyticsPageFilters) {
  const from = new Date(`${filters.from}T12:00:00.000Z`).getTime();
  const to = new Date(`${filters.to}T12:00:00.000Z`).getTime();
  return Math.round((to - from) / 86_400_000) + 1;
}

function datePresetLabel(t: (key: string) => string, days: number) {
  return t(`analytics.last${days}Days`);
}

function channelLabel(t: (key: string) => string, channel: TrafficAnalyticsChannel) {
  return t(`analytics.channel.${channel}`);
}

function formatNumber(value: number, locale: AdminLocale) {
  return new Intl.NumberFormat(numberLocale(locale)).format(value);
}

function formatDecimal(value: number, locale: AdminLocale) {
  return new Intl.NumberFormat(numberLocale(locale), {maximumFractionDigits: 2}).format(value);
}

function formatPercent(value: number, locale: AdminLocale) {
  return new Intl.NumberFormat(numberLocale(locale), {style: 'percent', maximumFractionDigits: 1}).format(value);
}

function formatDate(value: string, locale: AdminLocale) {
  return new Intl.DateTimeFormat(numberLocale(locale), {dateStyle: 'medium', timeZone: 'Asia/Seoul'}).format(new Date(`${value}T00:00:00+09:00`));
}

function formatDateTime(value: string, locale: AdminLocale) {
  return new Intl.DateTimeFormat(numberLocale(locale), {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul'}).format(new Date(value));
}

function numberLocale(locale: AdminLocale) {
  return locale === 'zh' ? 'zh-CN' : locale === 'ko' ? 'ko-KR' : 'en-US';
}
