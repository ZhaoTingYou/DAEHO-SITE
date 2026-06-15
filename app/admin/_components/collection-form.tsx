import Link from 'next/link';

import {saveCollectionAction} from '../actions';
import {createAdminTranslator, getContentLocaleLabel} from '@/lib/admin-i18n';
import {locales, type Locale} from '@/lib/locales';
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

export function CollectionForm({item, messages}: {item?: CollectionItem; messages: Record<string, string>}) {
  const t = createAdminTranslator(messages);

  return (
    <form action={saveCollectionAction} className="grid gap-6">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <Panel className="p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TextField label={t('form.slug')} name="slug" defaultValue={item?.slug} required placeholder="ring-01" />
          <TextField label={t('form.category')} name="category" defaultValue={item?.category} required placeholder="champion" />
          <TextField label={t('form.sportCategory')} name="sportCategory" defaultValue={item?.sportCategory} placeholder="baseball" />
          <TextField label={t('form.imageFilename')} name="imagePath" defaultValue={item?.imagePath} placeholder="collection_ring_01.png" />
          <TextField label={t('common.sortOrder')} name="sortOrder" type="number" defaultValue={item?.sortOrder ?? 0} />
          <CheckboxField label={t('form.visible')} name="isVisible" defaultChecked={item?.isVisible ?? true} />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <TextAreaField label={t('form.galleryJson')} name="gallery" defaultValue={formatJson(item?.gallery ?? [])} rows={7} />
          <TextAreaField label={t('form.specsJson')} name="specs" defaultValue={formatJson(item?.specs ?? {})} rows={7} />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        {locales.map((locale) => (
          <TranslationPanel
            key={locale}
            locale={locale}
            messages={messages}
            translation={getTranslation(item, locale)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/admin/collections" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
          {t('common.cancel')}
        </Link>
        <SubmitButton>{item ? t('form.saveCollection') : t('form.createCollection')}</SubmitButton>
      </div>
    </form>
  );
}

function TranslationPanel({
  locale,
  messages,
  translation
}: {
  locale: Locale;
  messages: Record<string, string>;
  translation: CollectionTranslation;
}) {
  const t = createAdminTranslator(messages);

  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center justify-between border-b border-[#e4e7ec] pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{getContentLocaleLabel(messages, locale)}</h2>
        <SecondaryLink href="/admin/media">{t('common.media')}</SecondaryLink>
      </div>
      <div className="grid gap-4">
        <TextField label={t('form.title')} name={`${locale}.title`} defaultValue={translation.title} required />
        <TextAreaField label={t('form.caption')} name={`${locale}.caption`} defaultValue={translation.caption} rows={3} />
        <TextAreaField label={t('form.story')} name={`${locale}.story`} defaultValue={translation.story} rows={5} />
        <TextField label={t('form.categoryLabel')} name={`${locale}.categoryLabel`} defaultValue={translation.categoryLabel} />
        <TextField label={t('form.sportCategoryLabel')} name={`${locale}.sportCategoryLabel`} defaultValue={translation.sportCategoryLabel} />
        <TextField label={t('form.seoTitle')} name={`${locale}.seoTitle`} defaultValue={translation.seoTitle} />
        <TextAreaField label={t('form.seoDescription')} name={`${locale}.seoDescription`} defaultValue={translation.seoDescription} rows={3} />
        <TextField label={t('form.ogImage')} name={`${locale}.ogImagePath`} defaultValue={translation.ogImagePath} />
      </div>
    </Panel>
  );
}

function getTranslation(item: CollectionItem | undefined, locale: Locale) {
  return (item?.translations[locale] ?? {}) as CollectionTranslation;
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}
