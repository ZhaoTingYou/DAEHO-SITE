import {notFound} from 'next/navigation';

import {getAdminI18n} from '@/lib/admin-i18n';
import {getNews} from '@/lib/cms/repositories';

import {PageHeader} from '../../../_components/admin-shell';
import {NewsForm} from '../../../_components/news-form';

type Props = {
  params: Promise<{id: string}>;
};

export default async function AdminNewsEditPage({params}: Props) {
  const {messages, t} = await getAdminI18n();
  const {id} = await params;
  const item = id === 'new' ? undefined : getNews(id);

  if (id !== 'new' && !item) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={item ? t('news.editTitle') : t('news.newTitle')}
        description={t('news.editDescription')}
      />
      <NewsForm item={item ?? undefined} messages={messages} />
    </>
  );
}
