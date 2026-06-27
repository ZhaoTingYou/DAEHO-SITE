import {notFound} from 'next/navigation';

import {getAdminI18n} from '@/lib/admin-i18n';
import {getCollection, listMedia} from '@/lib/cms/repositories';

import {CollectionForm} from '../../../_components/collection-form';
import type {MediaLibraryItem} from '../../../_components/admin-fields';
import {PageHeader} from '../../../_components/admin-shell';

type Props = {
  params: Promise<{id: string}>;
  searchParams?: Promise<{error?: string}>;
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
      {query?.error === 'file' ? (
        <div className="mb-5 rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-4 py-3 text-sm font-semibold text-[#b42318]">
          {t('page.uploadError')}
        </div>
      ) : null}
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
