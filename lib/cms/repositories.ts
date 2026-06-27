import 'server-only';

import type {
  collectionPayloadSchema,
  contactInquirySchema,
  golfInquirySchema,
  inquiryStatusSchema,
  mediaPayloadSchema,
  mediaUpdateSchema,
  newsPayloadSchema,
  pagePayloadSchema
} from './validation';
import type {Locale} from '@/lib/locales';
import type {z} from 'zod';

type PagePayload = z.infer<typeof pagePayloadSchema>;
type NewsPayload = z.infer<typeof newsPayloadSchema>;
type CollectionPayload = z.infer<typeof collectionPayloadSchema>;
type ContactInquiryPayload = z.infer<typeof contactInquirySchema>;
type GolfInquiryPayload = z.infer<typeof golfInquirySchema>;
type InquiryStatusPayload = z.infer<typeof inquiryStatusSchema>;
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
  status: InquiryStatusPayload['status'];
  locale: Locale;
  name: string;
  contact: string;
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

export type CmsEmailEvent = {
  id: string;
  inquiryId: string;
  eventType: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'skipped' | 'failed';
  providerMessageId: string;
  errorMessage: string;
  createdAt: string;
};

type RequestMeta = {
  userAgent: string;
  ipAddress: string;
};

type CmsFetchOptions = {
  admin?: boolean;
  body?: unknown;
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

  const response = await cmsFetch<{items: Array<Record<string, unknown>>}>(`/api/cms/news?locale=${locale}`);
  return response.items;
}

export async function getPublicPage(pageKey: string, locale: Locale) {
  const staticPage = await readStaticSnapshotValue((snapshot) => snapshot.getStaticPublicPage(pageKey, locale));
  if (staticPage !== undefined) {
    return staticPage;
  }

  return cmsFetch<Record<string, unknown>>(`/api/cms/pages/${encodeURIComponent(pageKey)}?locale=${locale}`, {
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
  return response.item;
}

export async function updateNews(idOrSlug: string, payload: NewsPayload) {
  const response = await cmsFetch<{item: CmsNews}>(`/api/admin/news/${encodeURIComponent(idOrSlug)}`, {
    admin: true,
    method: 'PUT',
    body: payload,
    notFound: null
  });
  return response?.item ?? null;
}

export async function deleteNews(idOrSlug: string) {
  const response = await cmsFetch<{ok: boolean}>(`/api/admin/news/${encodeURIComponent(idOrSlug)}`, {
    admin: true,
    method: 'DELETE',
    notFound: null
  });
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

  const response = await cmsFetch<{items: Array<Record<string, unknown>>}>(`/api/cms/collections?locale=${locale}`);
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
  return response.item;
}

export async function updateCollection(idOrSlug: string, payload: CollectionPayload) {
  const response = await cmsFetch<{item: CmsCollection}>(`/api/admin/collections/${encodeURIComponent(idOrSlug)}`, {
    admin: true,
    method: 'PUT',
    body: payload,
    notFound: null
  });
  return response?.item ?? null;
}

export async function deleteCollection(idOrSlug: string) {
  const response = await cmsFetch<{ok: boolean}>(`/api/admin/collections/${encodeURIComponent(idOrSlug)}`, {
    admin: true,
    method: 'DELETE',
    notFound: null
  });
  return Boolean(response?.ok);
}

export async function createContactInquiry(payload: ContactInquiryPayload, requestMeta: RequestMeta) {
  const response = await cmsFetch<{inquiry: CmsInquiry; email: unknown}>('/api/inquiries/contact', {
    method: 'POST',
    body: payload,
    headers: requestMetaHeaders(requestMeta)
  });
  return response;
}

export async function createGolfInquiry(payload: GolfInquiryPayload, requestMeta: RequestMeta) {
  const response = await cmsFetch<{inquiry: CmsInquiry; email: unknown}>('/api/inquiries/golf', {
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

export async function getInquiry(id: string) {
  const response = await cmsFetch<{inquiry: CmsInquiry; emailEvents: CmsEmailEvent[]}>(`/api/admin/inquiries/${encodeURIComponent(id)}`, {
    admin: true,
    notFound: null
  });
  return response?.inquiry ?? null;
}

export async function listEmailEventsForInquiry(inquiryId: string) {
  const response = await cmsFetch<{inquiry: CmsInquiry; emailEvents: CmsEmailEvent[]}>(`/api/admin/inquiries/${encodeURIComponent(inquiryId)}`, {
    admin: true,
    notFound: null
  });
  return response?.emailEvents ?? [];
}

export async function updateInquiryStatus(id: string, payload: InquiryStatusPayload) {
  const response = await cmsFetch<{inquiry: CmsInquiry; emailEvents: CmsEmailEvent[]}>(`/api/admin/inquiries/${encodeURIComponent(id)}`, {
    admin: true,
    method: 'PATCH',
    body: payload,
    notFound: null
  });
  return response?.inquiry ?? null;
}

export async function resendInquiryNotification(id: string) {
  return cmsFetch<{email: unknown}>(`/api/admin/inquiries/${encodeURIComponent(id)}/notify`, {
    admin: true,
    method: 'POST'
  });
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

export async function createEmailEvent(_payload?: unknown) {
  return '';
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
    cache: 'no-store'
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

async function readStaticSnapshotValue<T>(
  reader: (snapshot: typeof import('./static-snapshot')) => T
): Promise<T | undefined> {
  if (process.env.CMS_PREVIEW_STATIC !== 'true') {
    return undefined;
  }

  return reader(await import('./static-snapshot'));
}
