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
  return getCollectionCategoryMetadata({params, categoryId: 'champion'});
}

export default function ChampionCollectionPage({params}: Props) {
  return CollectionCategoryPage({params, categoryId: 'champion'});
}
