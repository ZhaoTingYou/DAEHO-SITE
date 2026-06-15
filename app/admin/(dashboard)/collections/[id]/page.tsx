import {notFound} from 'next/navigation';

import {getCollection} from '@/lib/cms/repositories';

import {CollectionForm} from '../../../_components/collection-form';
import {PageHeader} from '../../../_components/admin-shell';

type Props = {
  params: Promise<{id: string}>;
};

export default async function AdminCollectionEditPage({params}: Props) {
  const {id} = await params;
  const item = id === 'new' ? undefined : getCollection(id);

  if (id !== 'new' && !item) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={item ? 'Edit collection' : 'New collection'}
        description="Use gallery and specs JSON for now; these can become richer controls when the final content model settles."
      />
      <CollectionForm item={item ?? undefined} />
    </>
  );
}
