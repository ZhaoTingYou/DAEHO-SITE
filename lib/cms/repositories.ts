import 'server-only';

import type {
  collectionPayloadSchema,
  contactInquirySchema,
  golfInquirySchema,
  inquiryStatusDefinitionSchema,
  inquiryStatusDefinitionUpdateSchema,
  inquiryStatusSchema,
  mediaPayloadSchema,
  mediaUpdateSchema,
  newsPayloadSchema,
  pagePayloadSchema
} from './validation';
import type {Locale} from '@/lib/locales';
import {
  publicCmsCacheSeconds,
  publicCollectionItemCacheTags,
  publicCollectionListCacheTags,
  publicNewsItemCacheTags,
  publicNewsListCacheTags,
  publicPageCacheTags,
  revalidatePublicCollectionCache,
  revalidatePublicNewsCache,
  revalidatePublicPageCache
} from '@/lib/cms/public-cache';
import {z} from 'zod';

type PagePayload = z.infer<typeof pagePayloadSchema>;
type NewsPayload = z.infer<typeof newsPayloadSchema>;
type CollectionPayload = z.infer<typeof collectionPayloadSchema>;
type ContactInquiryPayload = z.infer<typeof contactInquirySchema>;
type GolfInquiryPayload = z.infer<typeof golfInquirySchema>;
type InquiryStatusPayload = z.infer<typeof inquiryStatusSchema>;
type InquiryStatusDefinitionPayload = z.infer<typeof inquiryStatusDefinitionSchema>;
type InquiryStatusDefinitionUpdatePayload = z.infer<typeof inquiryStatusDefinitionUpdateSchema>;
type MediaPayload = z.infer<typeof mediaPayloadSchema>;
type MediaUpdatePayload = z.infer<typeof mediaUpdateSchema>;

export type CmsPage = {
  pageKey: string;
  section: string;
  sortOrder: number;
  content: Record<Locale, unknown>;
  seo: Record<Locale, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CmsNews = {
  id: string;
  slug: string;
  category: string;
  imagePath: string;
  mobileImagePath: string;
  publishedAt: string;
  isFeatured: boolean;
  isVisible: boolean;
  sortOrder: number;
  translations: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CmsCollection = {
  id: string;
  slug: string;
  category: string;
  sportCategory: string;
  imagePath: string;
  gallery: unknown[];
  specs: Record<string, unknown>;
  isVisible: boolean;
  sortOrder: number;
  translations: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CmsMedia = {
  id: string;
  filename: string;
  path: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  altKo: string;
  altEn: string;
  storageProvider: string;
  storageKey: string;
  createdAt: string;
  updatedAt: string;
};

export type CmsInquiry = {
  id: string;
  source: 'contact' | 'golf';
  status: string;
  locale: Locale;
  name: string;
  contact: string;
  phone: string;
  email: string;
  organization: string;
  inquiryType: string;
  team: string;
  quantity: number | null;
  dueDate: string;
  useCase: string;
  message: string;
  configuration: unknown;
  pagePath: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  updatedAt: string;
};

export type CmsInquiryStatusDefinition = {
  code: string;
  labelKo: string;
  labelEn: string;
  labelZh: string;
  color: 'slate' | 'blue' | 'amber' | 'green' | 'red' | 'purple';
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CmsInquiryStatusEvent = {
  id: string;
  inquiryId: string;
  previousStatus: CmsInquiry['status'];
  nextStatus: CmsInquiry['status'];
  actor: string;
  createdAt: string;
};

export type CmsNotificationJob = {
  id: string;
  inquiryId: string;
  statusEventId: string | null;
  channel: 'email' | 'kakao';
  audience: 'internal' | 'customer';
  eventType: 'new_inquiry' | 'status_changed';
  inquiryStatus: string;
  locale: Locale;
  recipient: string;
  subject: string;
  renderedBody: string;
  templateId: string | null;
  providerTemplateCode: string;
  kakaoTemplateType: 'basic' | 'highlight';
  status: 'queued' | 'processing' | 'provider_pending' | 'sent' | 'failed' | 'needs_attention';
  retryBlocked: boolean;
  attemptCount: number;
  deliveryCheckCount: number;
  nextAttemptAt: string;
  providerMessageId: string;
  lastError: string;
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;
};

export type CmsNotificationAttempt = {
  id: string;
  jobId: string;
  attemptNumber: number;
  status: 'accepted' | 'sent' | 'failed';
  providerMessageId: string;
  errorMessage: string;
  createdAt: string;
};

export type CmsInquiryDetail = {
  inquiry: CmsInquiry;
  statusEvents: CmsInquiryStatusEvent[];
  notificationJobs: CmsNotificationJob[];
  notificationAttempts: CmsNotificationAttempt[];
};

export type CmsNotificationSettings = {
  id: string;
  internalEmail: string;
  internalEmailEnabled: boolean;
  customerEmailEnabled: boolean;
  kakaoEnabled: boolean;
  updatedAt: string;
};

export type CmsNotificationTemplate = {
  id: string;
  templateKey: string;
  channel: 'email' | 'kakao';
  audience: 'internal' | 'customer';
  eventType: 'new_inquiry' | 'status_changed';
  inquiryStatus: string;
  locale: Locale;
  version: number;
  subject: string;
  body: string;
  providerTemplateCode: string;
  kakaoTemplateType: 'basic' | 'highlight';
  approvalStatus: 'draft' | 'pending' | 'approved';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CmsStatusPreview = {
  changed: boolean;
  previousStatus: CmsInquiry['status'];
  nextStatus: CmsInquiry['status'];
  notifications: Array<{
    channel: 'email' | 'kakao';
    audience: 'internal' | 'customer';
    maskedRecipient: string;
    subject: string;
    renderedBody: string;
    enabled: boolean;
    ready: boolean;
    reason: string;
  }>;
};

export const trafficAnalyticsChannels = [
  'google',
  'naver',
  'instagram',
  'kakao',
  'qr',
  'social',
  'referral',
  'direct',
  'other'
] as const;

export type TrafficAnalyticsChannel = (typeof trafficAnalyticsChannels)[number];

export type TrafficAnalyticsFilters = {
  from: string;
  to: string;
  channel?: TrafficAnalyticsChannel;
  page?: number;
  pageSize?: 25 | 50 | 100;
};

export type TrafficAnalyticsSummary = {
  totals: {
    sessions: number;
    pageViews: number;
    activeSessions: number;
    averagePagesPerSession: number;
  };
  daily: Array<{date: string; sessions: number; pageViews: number}>;
  channels: Array<{
    channel: string;
    source: string;
    medium: string;
    sessions: number;
    pageViews: number;
    share: number;
  }>;
  landingPages: Array<{path: string; sessions: number; leadingChannel: string}>;
};

export type TrafficAnalyticsVisit = {
  channel: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  referrerHost: string;
  landingPath: string;
  latestPath: string;
  locale: string;
  deviceClass: string;
  pageViewCount: number;
  startedAt: string;
  lastActivityAt: string;
};

export type TrafficAnalyticsVisits = {
  items: TrafficAnalyticsVisit[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const analyticsCountSchema = z.number().int().nonnegative();
const trafficAnalyticsChannelSchema = z.enum(trafficAnalyticsChannels);
const trafficAnalyticsSummarySchema: z.ZodType<TrafficAnalyticsSummary> = z.strictObject({
  totals: z.strictObject({
    sessions: analyticsCountSchema,
    pageViews: analyticsCountSchema,
    activeSessions: analyticsCountSchema,
    averagePagesPerSession: z.number().nonnegative()
  }),
  daily: z.array(z.strictObject({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sessions: analyticsCountSchema,
    pageViews: analyticsCountSchema
  })),
  channels: z.array(z.strictObject({
    channel: trafficAnalyticsChannelSchema,
    source: z.string(),
    medium: z.string(),
    sessions: analyticsCountSchema,
    pageViews: analyticsCountSchema,
    share: z.number().min(0).max(1)
  })),
  landingPages: z.array(z.strictObject({
    path: z.string(),
    sessions: analyticsCountSchema,
    leadingChannel: trafficAnalyticsChannelSchema
  })).max(10)
});
const trafficAnalyticsVisitsSchema: z.ZodType<TrafficAnalyticsVisits> = z.strictObject({
  items: z.array(z.strictObject({
    channel: trafficAnalyticsChannelSchema,
    source: z.string(),
    medium: z.string(),
    campaign: z.string(),
    content: z.string(),
    referrerHost: z.string(),
    landingPath: z.string(),
    latestPath: z.string(),
    locale: z.enum(['ko', 'en']),
    deviceClass: z.enum(['desktop', 'tablet', 'mobile']),
    pageViewCount: analyticsCountSchema,
    startedAt: z.string().min(1),
    lastActivityAt: z.string().min(1)
  })),
  total: analyticsCountSchema,
  page: z.number().int().positive(),
  pageSize: z.union([z.literal(25), z.literal(50), z.literal(100)]),
  totalPages: analyticsCountSchema
});

type RequestMeta = {
  userAgent: string;
  ipAddress: string;
};

type CmsFetchOptions = {
  admin?: boolean;
  body?: unknown;
  cacheTags?: string[];
  headers?: HeadersInit;
  method?: string;
};

export class CmsBackendError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: unknown
  ) {
    super(message);
  }
}

export function getCmsBackendBaseUrl() {
  return (process.env.CMS_BACKEND_URL || 'http://localhost:8080').replace(/\/+$/, '');
}

export async function cmsBackendRequest<T>(path: string, options: CmsFetchOptions = {}) {
  return cmsFetch<T>(path, options);
}

export async function getTrafficAnalyticsSummary(filters: TrafficAnalyticsFilters) {
  const response = await cmsFetch<unknown>(`/api/admin/analytics/summary${trafficAnalyticsQuery(filters)}`, {admin: true});
  return trafficAnalyticsSummarySchema.parse(response);
}

export async function listTrafficAnalyticsVisits(filters: TrafficAnalyticsFilters) {
  const response = await cmsFetch<unknown>(`/api/admin/analytics/visits${trafficAnalyticsQuery(filters, true)}`, {admin: true});
  return trafficAnalyticsVisitsSchema.parse(response);
}

export async function listPages() {
  const staticPages = await readStaticSnapshotValue((snapshot) => snapshot.listStaticPages());
  if (staticPages !== undefined) {
    return staticPages as CmsPage[];
  }

  const response = await cmsFetch<{items: CmsPage[]}>('/api/admin/pages', {admin: true});
  return response.items;
}

export async function getPage(pageKey: string) {
  const staticPage = await readStaticSnapshotValue((snapshot) => snapshot.getStaticPage(pageKey));
  if (staticPage !== undefined) {
    return staticPage as CmsPage | null;
  }

  const response = await cmsFetch<{page: CmsPage}>(`/api/admin/pages/${encodeURIComponent(pageKey)}`, {
    admin: true,
    notFound: null
  });
  return response?.page ?? null;
}

export async function upsertPage(pageKey: string, payload: PagePayload) {
  const response = await cmsFetch<{page: CmsPage}>(`/api/admin/pages/${encodeURIComponent(pageKey)}`, {
    admin: true,
    method: 'PUT',
    body: payload
  });
  revalidatePublicPageCache(pageKey);
  return response.page;
}

export async function listNews() {
  const response = await cmsFetch<{items: CmsNews[]}>('/api/admin/news', {admin: true});
  return response.items;
}

export async function listPublicNews(locale: Locale) {
  const staticItems = await readStaticSnapshotValue((snapshot) => snapshot.listStaticPublicNews(locale));
  if (staticItems !== undefined) {
    return staticItems;
  }

  const response = await cmsFetch<{items: Array<Record<string, unknown>>}>(`/api/cms/news?locale=${locale}`, {
    cacheTags: publicNewsListCacheTags(locale)
  });
  return response.items;
}

export async function getPublicPage(pageKey: string, locale: Locale) {
  const staticPage = await readStaticSnapshotValue((snapshot) => snapshot.getStaticPublicPage(pageKey, locale));
  if (staticPage !== undefined) {
    return staticPage;
  }

  return cmsFetch<Record<string, unknown>>(`/api/cms/pages/${encodeURIComponent(pageKey)}?locale=${locale}`, {
    cacheTags: publicPageCacheTags(locale, pageKey),
    notFound: null
  });
}

export async function getNews(idOrSlug: string) {
  const response = await cmsFetch<{item: CmsNews}>(`/api/admin/news/${encodeURIComponent(idOrSlug)}`, {
    admin: true,
    notFound: null
  });
  return response?.item ?? null;
}

export async function getPublicNews(slug: string, locale: Locale) {
  const staticItem = await readStaticSnapshotValue((snapshot) => snapshot.getStaticPublicNews(slug, locale));
  if (staticItem !== undefined) {
    return staticItem;
  }

  const response = await cmsFetch<{item: Record<string, unknown>}>(`/api/cms/news/${encodeURIComponent(slug)}?locale=${locale}`, {
    cacheTags: publicNewsItemCacheTags(locale, slug),
    notFound: null
  });
  return response?.item ?? null;
}

export async function createNews(payload: NewsPayload) {
  const response = await cmsFetch<{item: CmsNews}>('/api/admin/news', {
    admin: true,
    method: 'POST',
    body: payload
  });
  revalidatePublicNewsCache(null, response.item.slug);
  return response.item;
}

export async function updateNews(idOrSlug: string, payload: NewsPayload) {
  const previousItem = await getNews(idOrSlug);
  const response = await cmsFetch<{item: CmsNews}>(`/api/admin/news/${encodeURIComponent(idOrSlug)}`, {
    admin: true,
    method: 'PUT',
    body: payload,
    notFound: null
  });
  if (response?.item) {
    revalidatePublicNewsCache(previousItem?.slug, response.item.slug);
  }
  return response?.item ?? null;
}

export async function deleteNews(idOrSlug: string) {
  const previousItem = await getNews(idOrSlug);
  const response = await cmsFetch<{ok: boolean}>(`/api/admin/news/${encodeURIComponent(idOrSlug)}`, {
    admin: true,
    method: 'DELETE',
    notFound: null
  });
  if (response?.ok) {
    revalidatePublicNewsCache(previousItem?.slug, null);
  }
  return Boolean(response?.ok);
}

export async function listCollections() {
  const response = await cmsFetch<{items: CmsCollection[]}>('/api/admin/collections', {admin: true});
  return response.items;
}

export async function listPublicCollections(locale: Locale) {
  const staticItems = await readStaticSnapshotValue((snapshot) => snapshot.listStaticPublicCollections(locale));
  if (staticItems !== undefined) {
    return staticItems;
  }

  const response = await cmsFetch<{items: Array<Record<string, unknown>>}>(`/api/cms/collections?locale=${locale}`, {
    cacheTags: publicCollectionListCacheTags(locale)
  });
  return response.items;
}

export async function getCollection(idOrSlug: string) {
  const response = await cmsFetch<{item: CmsCollection}>(`/api/admin/collections/${encodeURIComponent(idOrSlug)}`, {
    admin: true,
    notFound: null
  });
  return response?.item ?? null;
}

export async function getPublicCollection(slug: string, locale: Locale) {
  const staticItem = await readStaticSnapshotValue((snapshot) => snapshot.getStaticPublicCollection(slug, locale));
  if (staticItem !== undefined) {
    return staticItem;
  }

  const response = await cmsFetch<{item: Record<string, unknown>}>(`/api/cms/collections/${encodeURIComponent(slug)}?locale=${locale}`, {
    cacheTags: publicCollectionItemCacheTags(locale, slug),
    notFound: null
  });
  return response?.item ?? null;
}

export async function createCollection(payload: CollectionPayload) {
  const response = await cmsFetch<{item: CmsCollection}>('/api/admin/collections', {
    admin: true,
    method: 'POST',
    body: payload
  });
  revalidatePublicCollectionCache(null, response.item.slug);
  return response.item;
}

export async function updateCollection(idOrSlug: string, payload: CollectionPayload) {
  const previousItem = await getCollection(idOrSlug);
  const response = await cmsFetch<{item: CmsCollection}>(`/api/admin/collections/${encodeURIComponent(idOrSlug)}`, {
    admin: true,
    method: 'PUT',
    body: payload,
    notFound: null
  });
  if (response?.item) {
    revalidatePublicCollectionCache(previousItem?.slug, response.item.slug);
  }
  return response?.item ?? null;
}

export async function deleteCollection(idOrSlug: string) {
  const previousItem = await getCollection(idOrSlug);
  const response = await cmsFetch<{ok: boolean}>(`/api/admin/collections/${encodeURIComponent(idOrSlug)}`, {
    admin: true,
    method: 'DELETE',
    notFound: null
  });
  if (response?.ok) {
    revalidatePublicCollectionCache(previousItem?.slug, null);
  }
  return Boolean(response?.ok);
}

export async function createContactInquiry(payload: ContactInquiryPayload, requestMeta: RequestMeta) {
  const response = await cmsFetch<{inquiry: CmsInquiry}>('/api/inquiries/contact', {
    method: 'POST',
    body: payload,
    headers: requestMetaHeaders(requestMeta)
  });
  return response;
}

export async function createGolfInquiry(payload: GolfInquiryPayload, requestMeta: RequestMeta) {
  const response = await cmsFetch<{inquiry: CmsInquiry}>('/api/inquiries/golf', {
    method: 'POST',
    body: payload,
    headers: requestMetaHeaders(requestMeta)
  });
  return response;
}

export async function listInquiries(filters: {status?: string; source?: string}) {
  const params = new URLSearchParams();
  if (filters.status) {
    params.set('status', filters.status);
  }
  if (filters.source) {
    params.set('source', filters.source);
  }
  const suffix = params.toString() ? `?${params}` : '';
  const response = await cmsFetch<{items: CmsInquiry[]}>(`/api/admin/inquiries${suffix}`, {admin: true});
  return response.items;
}

export async function listInquiryStatuses() {
  const response = await cmsFetch<{items: CmsInquiryStatusDefinition[]}>(
    '/api/admin/inquiry-statuses',
    {admin: true}
  );
  return response.items;
}

export async function createInquiryStatus(payload: InquiryStatusDefinitionPayload) {
  return cmsFetch<{item: CmsInquiryStatusDefinition}>('/api/admin/inquiry-statuses', {
    admin: true,
    method: 'POST',
    body: payload
  });
}

export async function updateInquiryStatusDefinition(code: string, payload: InquiryStatusDefinitionUpdatePayload) {
  return cmsFetch<{item: CmsInquiryStatusDefinition}>(
    `/api/admin/inquiry-statuses/${encodeURIComponent(code)}`,
    {admin: true, method: 'PATCH', body: payload}
  );
}

export async function getInquiry(id: string) {
  const response = await getInquiryDetail(id);
  return response?.inquiry ?? null;
}

export async function getInquiryDetail(id: string) {
  return cmsFetch<CmsInquiryDetail>(`/api/admin/inquiries/${encodeURIComponent(id)}`, {
    admin: true,
    notFound: null
  });
}

export async function updateInquiryStatus(id: string, payload: InquiryStatusPayload) {
  return cmsFetch<CmsInquiryDetail>(`/api/admin/inquiries/${encodeURIComponent(id)}`, {
    admin: true,
    method: 'PATCH',
    body: payload,
    notFound: null
  });
}

export async function previewInquiryStatus(id: string, payload: InquiryStatusPayload) {
  return cmsFetch<CmsStatusPreview>(`/api/admin/inquiries/${encodeURIComponent(id)}/status-preview`, {
    admin: true,
    method: 'POST',
    body: payload
  });
}

export async function retryNotificationJob(jobId: string) {
  return cmsFetch<{job: CmsNotificationJob}>(`/api/admin/notifications/jobs/${encodeURIComponent(jobId)}/retry`, {
    admin: true,
    method: 'POST'
  });
}

export async function getNotificationSettings() {
  const response = await cmsFetch<{settings: CmsNotificationSettings}>('/api/admin/notifications/settings', {admin: true});
  return response.settings;
}

export async function updateNotificationSettings(payload: Omit<CmsNotificationSettings, 'id' | 'updatedAt'>) {
  const response = await cmsFetch<{settings: CmsNotificationSettings}>('/api/admin/notifications/settings', {
    admin: true,
    method: 'PUT',
    body: payload
  });
  return response.settings;
}

export async function getNotificationHealth() {
  return cmsFetch<{
    settings: CmsNotificationSettings;
    kakaoTemplatesReady: boolean;
    emailConfigured: boolean;
    kakaoConfigured: boolean;
    kakaoVerified: boolean;
    workerEnabled: boolean;
  }>('/api/admin/notifications/health', {admin: true});
}

export async function sendNotificationTest(payload: {
  channel: 'email' | 'kakao';
  recipient: string;
  templateKey: string;
}) {
  return cmsFetch<{success: boolean; providerMessageId: string; errorMessage: string}>(
    '/api/admin/notifications/test',
    {admin: true, method: 'POST', body: payload}
  );
}

export async function listNotificationTemplates() {
  const response = await cmsFetch<{items: CmsNotificationTemplate[]}>('/api/admin/notifications/templates', {admin: true});
  return response.items;
}

export async function createNotificationTemplateVersion(
  templateKey: string,
  payload: Pick<CmsNotificationTemplate, 'subject' | 'body' | 'providerTemplateCode' | 'kakaoTemplateType' | 'approvalStatus' | 'isActive'>
) {
  const response = await cmsFetch<{template: CmsNotificationTemplate}>(
    `/api/admin/notifications/templates/${encodeURIComponent(templateKey)}/versions`,
    {admin: true, method: 'POST', body: payload}
  );
  return response.template;
}

export async function listMedia() {
  const response = await cmsFetch<{items: CmsMedia[]}>('/api/admin/media', {admin: true});
  return response.items;
}

export async function getMedia(id: string) {
  const response = await cmsFetch<{item: CmsMedia}>(`/api/admin/media/${encodeURIComponent(id)}`, {
    admin: true,
    notFound: null
  });
  return response?.item ?? null;
}

export async function createMedia(payload: MediaPayload) {
  const response = await cmsFetch<{item: CmsMedia}>('/api/admin/media', {
    admin: true,
    method: 'POST',
    body: payload
  });
  return response.item;
}

export async function uploadMediaFile(file: File, payload: {filename?: string; altKo?: string; altEn?: string} = {}) {
  const formData = new FormData();
  formData.set('file', file);
  formData.set('filename', payload.filename ?? '');
  formData.set('altKo', payload.altKo ?? '');
  formData.set('altEn', payload.altEn ?? '');
  const response = await cmsFetch<{item: CmsMedia}>('/api/admin/media', {
    admin: true,
    method: 'POST',
    body: formData
  });
  return response.item;
}

export async function updateMedia(id: string, payload: MediaUpdatePayload) {
  const response = await cmsFetch<{item: CmsMedia}>(`/api/admin/media/${encodeURIComponent(id)}`, {
    admin: true,
    method: 'PATCH',
    body: payload,
    notFound: null
  });
  return response?.item ?? null;
}

export async function deleteMedia(id: string) {
  const response = await cmsFetch<{ok: boolean}>(`/api/admin/media/${encodeURIComponent(id)}`, {
    admin: true,
    method: 'DELETE',
    notFound: null
  });
  return Boolean(response?.ok);
}

function cmsFetch<T>(path: string, options?: CmsFetchOptions): Promise<T>;
function cmsFetch<T>(path: string, options: CmsFetchOptions & {notFound: null}): Promise<T | null>;
async function cmsFetch<T>(
  path: string,
  options: CmsFetchOptions & {notFound?: null} = {}
): Promise<T | null> {
  const url = `${getCmsBackendBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set('content-type', 'application/json');
  }

  if (options.admin) {
    const key = process.env.CMS_BACKEND_API_KEY || process.env.CMS_ADMIN_API_KEY || '';
    if (key) {
      headers.set('x-admin-api-key', key);
    }
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body instanceof FormData
      ? options.body
      : options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
    cache: options.cacheTags ? 'force-cache' : 'no-store',
    ...(options.cacheTags
      ? {
          next: {
            revalidate: publicCmsCacheSeconds,
            tags: options.cacheTags
          }
        }
      : {})
  });

  const text = await response.text();
  const payload = parseJsonPayload(text);

  if (response.status === 404 && options.notFound === null) {
    return null;
  }

  if (!response.ok) {
    throw new CmsBackendError(
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : `CMS backend request failed with status ${response.status}`,
      response.status,
      payload
    );
  }

  return payload as T;
}

function parseJsonPayload(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {error: text};
  }
}

function requestMetaHeaders(requestMeta: RequestMeta) {
  const headers = new Headers();
  if (requestMeta.userAgent) {
    headers.set('user-agent', requestMeta.userAgent);
  }
  if (requestMeta.ipAddress) {
    headers.set('x-forwarded-for', requestMeta.ipAddress);
  }
  return headers;
}

function trafficAnalyticsQuery(filters: TrafficAnalyticsFilters, includePagination = false) {
  const params = new URLSearchParams({from: filters.from, to: filters.to});

  if (filters.channel) {
    params.set('channel', filters.channel);
  }

  if (includePagination) {
    if (filters.page) {
      params.set('page', String(filters.page));
    }
    if (filters.pageSize) {
      params.set('pageSize', String(filters.pageSize));
    }
  }

  return `?${params.toString()}`;
}

async function readStaticSnapshotValue<T>(
  reader: (snapshot: typeof import('./static-snapshot')) => T
): Promise<T | undefined> {
  if (process.env.CMS_PREVIEW_STATIC !== 'true') {
    return undefined;
  }

  return reader(await import('./static-snapshot'));
}
