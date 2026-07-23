declare module '@/lib/admin-analytics-core.mjs' {
  import type {AdminLocale} from '@/lib/admin-locales';
  import type {TrafficAnalyticsChannel, TrafficAnalyticsFilters} from '@/lib/cms/repositories';

  export const MAX_ANALYTICS_PAGE: 1_000_000;

  export type AnalyticsSearchParams = Record<string, string | string[] | undefined>;

  export type AnalyticsPageFilters = TrafficAnalyticsFilters & {
    page: number;
    pageSize: 25;
  };

  export function normalizeAnalyticsFilters(
    query: AnalyticsSearchParams | undefined,
    today: string
  ): AnalyticsPageFilters;
  export function analyticsHref(
    filters: AnalyticsPageFilters,
    updates?: Partial<AnalyticsPageFilters>
  ): string;
  export function analyticsPageCorrectionHref(
    filters: AnalyticsPageFilters,
    totalPages: number
  ): string | null;
  export function cappedAnalyticsTotalPages(totalPages: number): number;
  export function isAnalyticsPresetActive(
    filters: AnalyticsPageFilters,
    today: string,
    days: number
  ): boolean;
  export function nowInSeoul(now?: Date): string;
  export function addDays(date: string, days: number): string;
  export function formatNumber(value: number, locale: AdminLocale): string;
  export function formatDecimal(value: number, locale: AdminLocale): string;
  export function formatPercent(value: number, locale: AdminLocale): string;
  export function formatDate(value: string, locale: AdminLocale): string;
  export function formatDateTime(value: string, locale: AdminLocale): string;

  export type {TrafficAnalyticsChannel};
}
