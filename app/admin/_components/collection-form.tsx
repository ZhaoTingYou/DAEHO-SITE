import Link from 'next/link';

import {saveCollectionAction} from '../actions';
import {
  CheckboxField,
  SecondaryLink,
  SubmitButton,
  TextAreaField,
  TextField
} from './admin-fields';
import {Panel} from './admin-shell';

type CollectionItem = {
  id: string;
  slug: string;
  category: string;
  sportCategory: string;
  imagePath: string;
  gallery: unknown;
  specs: unknown;
  isVisible: boolean;
  sortOrder: number;
  translations: Record<string, unknown>;
};

type CollectionTranslation = {
  title?: string;
  caption?: string;
  story?: string;
  categoryLabel?: string;
  sportCategoryLabel?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImagePath?: string;
};

export function CollectionForm({item}: {item?: CollectionItem}) {
  const ko = getTranslation(item, 'ko');
  const en = getTranslation(item, 'en');

  return (
    <form action={saveCollectionAction} className="grid gap-6">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <Panel className="p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TextField label="Slug" name="slug" defaultValue={item?.slug} required placeholder="ring-01" />
          <TextField label="Category" name="category" defaultValue={item?.category} required placeholder="champion" />
          <TextField label="Sport category" name="sportCategory" defaultValue={item?.sportCategory} placeholder="baseball" />
          <TextField label="Image filename" name="imagePath" defaultValue={item?.imagePath} placeholder="collection_ring_01.png" />
          <TextField label="Sort order" name="sortOrder" type="number" defaultValue={item?.sortOrder ?? 0} />
          <CheckboxField label="Visible" name="isVisible" defaultChecked={item?.isVisible ?? true} />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <TextAreaField label="Gallery JSON" name="gallery" defaultValue={formatJson(item?.gallery ?? [])} rows={7} />
          <TextAreaField label="Specs JSON" name="specs" defaultValue={formatJson(item?.specs ?? {})} rows={7} />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <TranslationPanel locale="ko" title="Korean" translation={ko} />
        <TranslationPanel locale="en" title="English" translation={en} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/admin/collections" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
          Cancel
        </Link>
        <SubmitButton>{item ? 'Save collection' : 'Create collection'}</SubmitButton>
      </div>
    </form>
  );
}

function TranslationPanel({
  locale,
  title,
  translation
}: {
  locale: 'ko' | 'en';
  title: string;
  translation: CollectionTranslation;
}) {
  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center justify-between border-b border-[#e4e7ec] pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{title}</h2>
        <SecondaryLink href="/admin/media">Media</SecondaryLink>
      </div>
      <div className="grid gap-4">
        <TextField label="Title" name={`${locale}.title`} defaultValue={translation.title} required />
        <TextAreaField label="Caption" name={`${locale}.caption`} defaultValue={translation.caption} rows={3} />
        <TextAreaField label="Story" name={`${locale}.story`} defaultValue={translation.story} rows={5} />
        <TextField label="Category label" name={`${locale}.categoryLabel`} defaultValue={translation.categoryLabel} />
        <TextField label="Sport category label" name={`${locale}.sportCategoryLabel`} defaultValue={translation.sportCategoryLabel} />
        <TextField label="SEO title" name={`${locale}.seoTitle`} defaultValue={translation.seoTitle} />
        <TextAreaField label="SEO description" name={`${locale}.seoDescription`} defaultValue={translation.seoDescription} rows={3} />
        <TextField label="OG image" name={`${locale}.ogImagePath`} defaultValue={translation.ogImagePath} />
      </div>
    </Panel>
  );
}

function getTranslation(item: CollectionItem | undefined, locale: 'ko' | 'en') {
  return (item?.translations[locale] ?? {}) as CollectionTranslation;
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}
