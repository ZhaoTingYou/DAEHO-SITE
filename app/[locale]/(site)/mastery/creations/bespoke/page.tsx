import type {Metadata} from 'next';

import {
  CollectionCategoryPage,
  getCollectionCategoryMetadata
} from '../_category-page';
import type {Locale} from '@/i18n/routing';

type Props = {
  params: Promise<{locale: Locale}>;
};

export function generateMetadata({params}: Props): Promise<Metadata> {
  return getCollectionCategoryMetadata({params, categoryId: 'bespoke'});
}

export default function BespokeCollectionPage({params}: Props) {
  return CollectionCategoryPage({params, categoryId: 'bespoke'});
}
