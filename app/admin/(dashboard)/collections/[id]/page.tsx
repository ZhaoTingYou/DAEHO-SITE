import {notFound} from 'next/navigation';

import {getAdminI18n} from '@/lib/admin-i18n';
import {getCollection} from '@/lib/cms/repositories';

import {CollectionForm} from '../../../_components/collection-form';
import {PageHeader} from '../../../_components/admin-shell';

type Props = {
  params: Promise<{id: string}>;
};

export default async function AdminCollectionEditPage({params}: Props) {
  const {messages, t} = await getAdminI18n();
  const {id} = await params;
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
      <CollectionForm item={item ?? undefined} messages={messages} />
    </>
  );
}
