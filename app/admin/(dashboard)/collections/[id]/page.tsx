import {notFound} from 'next/navigation';

import {getAdminI18n} from '@/lib/admin-i18n';
import {getCollection} from '@/lib/cms/repositories';

import {CollectionForm} from '../../../_components/collection-form';
import {PageHeader} from '../../../_components/admin-shell';

type Props = {
  params: Promise<{id: string}>;
  searchParams?: Promise<{error?: string}>;
};

export default async function AdminCollectionEditPage({params, searchParams}: Props) {
  const {messages, t} = await getAdminI18n();
  const {id} = await params;
  const query = await searchParams;
  const item = id === 'new' ? undefined : getCollection(id);

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
      <CollectionForm item={item ?? undefined} messages={messages} />
    </>
  );
}
