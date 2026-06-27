import 'server-only';

import type {Locale} from '@/lib/locales';
import previewSnapshot from '@/data/cms-preview.json';

import {
  getSnapshotPage,
  getSnapshotPublicCollection,
  getSnapshotPublicNews,
  getSnapshotPublicPage,
  listSnapshotPages,
  listSnapshotPublicCollections,
  listSnapshotPublicNews,
  type CmsStaticSnapshot
} from './static-snapshot-core';

export function listStaticPages() {
  const snapshot = readStaticSnapshot();
  return snapshot === undefined ? undefined : listSnapshotPages(snapshot);
}

export function getStaticPage(pageKey: string) {
  const snapshot = readStaticSnapshot();
  return snapshot === undefined ? undefined : getSnapshotPage(snapshot, pageKey);
}

export function getStaticPublicPage(pageKey: string, locale: Locale) {
  const snapshot = readStaticSnapshot();
  return snapshot === undefined ? undefined : getSnapshotPublicPage(snapshot, pageKey, locale);
}

export function listStaticPublicNews(locale: Locale) {
  const snapshot = readStaticSnapshot();
  return snapshot === undefined ? undefined : listSnapshotPublicNews(snapshot, locale);
}

export function getStaticPublicNews(slug: string, locale: Locale) {
  const snapshot = readStaticSnapshot();
  return snapshot === undefined ? undefined : getSnapshotPublicNews(snapshot, slug, locale);
}

export function listStaticPublicCollections(locale: Locale) {
  const snapshot = readStaticSnapshot();
  return snapshot === undefined ? undefined : listSnapshotPublicCollections(snapshot, locale);
}

export function getStaticPublicCollection(slug: string, locale: Locale) {
  const snapshot = readStaticSnapshot();
  return snapshot === undefined ? undefined : getSnapshotPublicCollection(snapshot, slug, locale);
}

export function isStaticCmsPreviewEnabled() {
  return process.env.CMS_PREVIEW_STATIC === 'true';
}

function readStaticSnapshot(): CmsStaticSnapshot | undefined {
  if (!isStaticCmsPreviewEnabled()) {
    return undefined;
  }

  const snapshot = previewSnapshot as CmsStaticSnapshot;
  if (snapshot.schemaVersion !== 1) {
    throw new Error(`Unsupported CMS static snapshot schemaVersion: ${String(snapshot.schemaVersion)}`);
  }

  return snapshot;
}
