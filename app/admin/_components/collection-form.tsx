import Link from 'next/link';

import {saveCollectionAction} from '../actions';
import {createAdminTranslator, getContentLocaleLabel} from '@/lib/admin-i18n';
import {collectionCategoryValues, isCollectionBackedCategory} from '@/lib/cms/collection-categories';
import {locales, type Locale} from '@/lib/locales';
import {
  CheckboxField,
  ImageUploadField,
  type MediaLibraryItem,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField
} from './admin-fields';
import {Panel} from './admin-shell';
import {CollectionGalleryField} from './collection-gallery-field';
import {ContentLocaleForm, ContentLocalePanel} from './content-locale-editor';

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
  story?: string;
  sportCategoryLabel?: string;
};

export function CollectionForm({
  item,
  mediaItems,
  messages
}: {
  item?: CollectionItem;
  mediaItems: MediaLibraryItem[];
  messages: Record<string, string>;
}) {
  const t = createAdminTranslator(messages);
  const gallery = normalizeGallery(item?.gallery, item?.imagePath);
  const specs = normalizeSpecs(item?.specs);

  return (
    <ContentLocaleForm
      action={saveCollectionAction}
      className="grid gap-6"
      label={t('contentLocale.editorLabel')}
      localeLabels={{
        ko: t('contentLocale.ko'),
        en: t('contentLocale.en')
      }}
    >
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <Panel className="min-w-0 p-5">
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TextField label={t('form.slug')} name="slug" defaultValue={item?.slug} required placeholder="ring-01" editorControls={false} />
          <SelectField label={t('form.category')} name="category" defaultValue={normalizeCollectionCategory(item?.category)} options={collectionCategoryOptions(t)} />
          <TextField label={t('form.sportCategory')} name="sportCategory" defaultValue={normalizeSportCategory(item)} placeholder="baseball" editorControls={false} />
          <TextField label={t('form.year')} name="specs.year" defaultValue={specs.year} editorControls={false} />
          <TextField label={t('common.sortOrder')} name="sortOrder" type="number" defaultValue={item?.sortOrder ?? 0} />
          <CheckboxField label={t('form.visible')} name="isVisible" defaultChecked={item?.isVisible ?? true} />
        </div>
        <div className="mt-4 grid min-w-0 gap-4">
          <ImageUploadField
            label={t('form.imageFilename')}
            name="imagePath"
            uploadName="imageUpload"
            defaultValue={item?.imagePath}
            uploadLabel={t('page.uploadLocalImage')}
            uploadHint={t('page.uploadLocalImageHint')}
            imageGuide={t('imageGuide.collectionCover')}
            emptyLabel={t('common.noImage')}
            changedLabel={t('common.changed')}
            selectedLabel={t('common.imageSelected')}
            mediaItems={mediaItems}
            mediaSelectLabel={t('media.selectFromLibrary')}
            mediaLibraryTitle={t('media.libraryTitle')}
            mediaEmptyLabel={t('media.libraryEmpty')}
            mediaSelectedLabel={t('media.selectedExisting')}
          />
        </div>
        <CollectionGalleryField
          gallery={gallery}
          mediaItems={mediaItems}
          title={t('form.gallery')}
          hint={t('form.galleryHint')}
          imageLabelTemplate={t('form.galleryImage', {count: '{count}'})}
          addButtonLabel={t('form.galleryAdd')}
          removeButtonLabel={t('form.galleryRemove')}
          uploadLabel={t('page.uploadLocalImage')}
          uploadHint={t('page.uploadLocalImageHint')}
          imageGuide={t('imageGuide.collectionGallery')}
          emptyLabel={t('common.noImage')}
          changedLabel={t('common.changed')}
          selectedLabel={t('common.imageSelected')}
          mediaSelectLabel={t('media.selectFromLibrary')}
          mediaLibraryTitle={t('media.libraryTitle')}
          mediaEmptyLabel={t('media.libraryEmpty')}
          mediaSelectedLabel={t('media.selectedExisting')}
        />
      </Panel>

      <div className="grid gap-6">
        {locales.map((locale) => (
          <ContentLocalePanel key={locale} locale={locale}>
            <TranslationPanel
              locale={locale}
              messages={messages}
              translation={getTranslation(item, locale)}
            />
          </ContentLocalePanel>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/admin/collections" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
          {t('common.cancel')}
        </Link>
        <SubmitButton>{item ? t('form.saveCollection') : t('form.createCollection')}</SubmitButton>
      </div>
    </ContentLocaleForm>
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
    <Panel className="min-w-0 p-5">
      <div className="mb-4 border-b border-[#e4e7ec] pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{getContentLocaleLabel(messages, locale)}</h2>
      </div>
      <div className="grid gap-4">
        <TextField label={t('form.title')} name={`${locale}.title`} defaultValue={translation.title} required editorControls={false} />
        <TextAreaField label={t('form.story')} name={`${locale}.story`} defaultValue={translation.story} rows={5} editorControls={false} />
        <TextField label={t('form.sportCategoryLabel')} name={`${locale}.sportCategoryLabel`} defaultValue={translation.sportCategoryLabel} editorControls={false} />
      </div>
    </Panel>
  );
}

function getTranslation(item: CollectionItem | undefined, locale: Locale) {
  return (item?.translations[locale] ?? {}) as CollectionTranslation;
}

function collectionCategoryOptions(t: (key: string) => string) {
  return collectionCategoryValues.map((value) => ({
    value,
    label: t(value === 'champion' ? 'collection.categoryChampion' : 'collection.categoryBespoke')
  }));
}

function normalizeCollectionCategory(value?: string) {
  return isCollectionBackedCategory(value) ? value : 'champion';
}

function normalizeSportCategory(item?: CollectionItem) {
  if (item?.sportCategory) {
    return item.sportCategory;
  }

  if (!item?.specs || typeof item.specs !== 'object' || Array.isArray(item.specs)) {
    return '';
  }

  const legacyValue = (item.specs as Record<string, unknown>).sportCategory;
  return typeof legacyValue === 'string' ? legacyValue : '';
}

function normalizeGallery(value: unknown, fallbackImage?: string) {
  const gallery = Array.isArray(value)
    ? value.filter((image): image is string => typeof image === 'string' && image.length > 0)
    : [];

  return gallery.length > 0 ? gallery : [fallbackImage].filter((image): image is string => Boolean(image));
}

function normalizeSpecs(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      year: ''
    };
  }

  const specs = value as Record<string, unknown>;

  return {
    year: typeof specs.year === 'string' ? specs.year : ''
  };
}
