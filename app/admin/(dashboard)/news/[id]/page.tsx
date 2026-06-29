import {notFound} from 'next/navigation';

import {getAdminI18n} from '@/lib/admin-i18n';
import {getNews, listMedia} from '@/lib/cms/repositories';

import {AdminActionAlert} from '../../../_components/admin-feedback';
import {PageHeader} from '../../../_components/admin-shell';
import {NewsForm} from '../../../_components/news-form';
import type {MediaLibraryItem} from '../../../_components/admin-fields';

type Props = {
  params: Promise<{id: string}>;
  searchParams?: Promise<Record<string, string | undefined>>;
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
      <AdminActionAlert searchParams={query} title={t('cmsAlert.title')} fallbackMessage={query?.error === 'file' ? t('page.uploadError') : t('cmsAlert.fallback')} />
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
