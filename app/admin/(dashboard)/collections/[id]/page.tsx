import {notFound} from 'next/navigation';

import {getAdminI18n} from '@/lib/admin-i18n';
import {getCollection, listMedia} from '@/lib/cms/repositories';

import {AdminActionAlert} from '../../../_components/admin-feedback';
import {CollectionForm} from '../../../_components/collection-form';
import type {MediaLibraryItem} from '../../../_components/admin-fields';
import {PageHeader} from '../../../_components/admin-shell';

type Props = {
  params: Promise<{id: string}>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function AdminCollectionEditPage({params, searchParams}: Props) {
  const {messages, t} = await getAdminI18n();
  const {id} = await params;
  const query = await searchParams;
  const item = id === 'new' ? undefined : await getCollection(id);
  const mediaItems = await getMediaLibraryItems();

  if (id !== 'new' && !item) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={item ? t('collection.editTitle') : t('collection.newTitle')}
        description={t('collection.editDescription')}
      />
      <AdminActionAlert searchParams={query} title={t('cmsAlert.title')} fallbackMessage={query?.error === 'file' ? t('page.uploadError') : t('cmsAlert.fallback')} />
      <CollectionForm item={item ?? undefined} mediaItems={mediaItems} messages={messages} />
    </>
  );
}

async function getMediaLibraryItems(): Promise<MediaLibraryItem[]> {
  return (await listMedia()).map((item) => ({
    filename: item.filename,
    url: item.url,
    alt: item.altKo || item.altEn || item.filename
  }));
}
