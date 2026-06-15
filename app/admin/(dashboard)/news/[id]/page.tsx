import {notFound} from 'next/navigation';

import {getNews} from '@/lib/cms/repositories';

import {PageHeader} from '../../../_components/admin-shell';
import {NewsForm} from '../../../_components/news-form';

type Props = {
  params: Promise<{id: string}>;
};

export default async function AdminNewsEditPage({params}: Props) {
  const {id} = await params;
  const item = id === 'new' ? undefined : getNews(id);

  if (id !== 'new' && !item) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={item ? 'Edit news' : 'New news'}
        description="Both Korean and English fields are required before the item is useful on the public site."
      />
      <NewsForm item={item ?? undefined} />
    </>
  );
}
