import {notFound} from 'next/navigation';

import {getAdminI18n} from '@/lib/admin-i18n';
import {getNews, listMedia} from '@/lib/cms/repositories';

import {PageHeader} from '../../../_components/admin-shell';
import {NewsForm} from '../../../_components/news-form';
import type {MediaLibraryItem} from '../../../_components/admin-fields';

type Props = {
  params: Promise<{id: string}>;
  searchParams?: Promise<{error?: string}>;
};

export default async function AdminNewsEditPage({params, searchParams}: Props) {
  const {messages, t} = await getAdminI18n();
  const {id} = await params;
  const query = await searchParams;
  const item = id === 'new' ? undefined : await getNews(id);
  const mediaItems = await getMediaLibraryItems();

  if (id !== 'new' && !item) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={item ? t('news.editTitle') : t('news.newTitle')}
        description={t('news.editDescription')}
      />
      {query?.error === 'file' ? (
        <div className="mb-5 rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-4 py-3 text-sm font-semibold text-[#b42318]">
          {t('page.uploadError')}
        </div>
      ) : null}
      <NewsForm item={item ?? undefined} mediaItems={mediaItems} messages={messages} />
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
