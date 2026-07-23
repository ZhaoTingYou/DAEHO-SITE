import Link from 'next/link';

import {saveCollectionAction} from '../actions';
import {createAdminTranslator, getContentLocaleLabel} from '@/lib/admin-i18n';
import {locales, type Locale} from '@/lib/locales';
import {
  CheckboxField,
  ImageUploadField,
  type MediaLibraryItem,
  SecondaryLink,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField
} from './admin-fields';
import {Panel} from './admin-shell';
import {CollectionGalleryField} from './collection-gallery-field';

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
    <form action={saveCollectionAction} className="grid gap-6">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <Panel className="p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TextField label={t('form.slug')} name="slug" defaultValue={item?.slug} required placeholder="ring-01" />
          <SelectField label={t('form.category')} name="category" defaultValue={normalizeCollectionCategory(item?.category)} options={collectionCategoryOptions(t)} />
          <TextField label={t('form.sportCategory')} name="sportCategory" defaultValue={item?.sportCategory} placeholder="baseball" />
          <TextField label={t('common.sortOrder')} name="sortOrder" type="number" defaultValue={item?.sortOrder ?? 0} />
          <CheckboxField label={t('form.visible')} name="isVisible" defaultChecked={item?.isVisible ?? true} />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
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
          <div className="grid gap-4 rounded-md border border-[#e4e7ec] bg-[#f8fafc] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{t('form.specs')}</p>
            <TextField label={t('form.year')} name="specs.year" defaultValue={specs.year} />
            <TextField label={t('form.sportCategory')} name="specs.sportCategory" defaultValue={specs.sportCategory} />
            <TextField
              label={t('form.linkHref')}
              name="specs.linkHref"
              defaultValue={specs.linkHref}
              placeholder="/mastery/creations/slug, https://…"
              inputMode="url"
              editorControls={false}
            />
          </div>
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
        <CollectionGalleryField
          gallery={specs.detailImages}
          mediaItems={mediaItems}
          title={t('form.detailGallery')}
          hint={t('form.detailGalleryHint')}
          imageLabelTemplate={t('form.detailGalleryImage', {count: '{count}'})}
          addButtonLabel={t('form.detailGalleryAdd')}
          removeButtonLabel={t('form.detailGalleryRemove')}
          namePrefix="detailGallery"
          uploadPrefix="detailGalleryUpload"
          maxImages={3}
          uploadLabel={t('page.uploadLocalImage')}
          uploadHint={t('page.uploadLocalImageHint')}
          imageGuide={t('imageGuide.collectionDetailGallery')}
          emptyLabel={t('common.noImage')}
          changedLabel={t('common.changed')}
          selectedLabel={t('common.imageSelected')}
          mediaSelectLabel={t('media.selectFromLibrary')}
          mediaLibraryTitle={t('media.libraryTitle')}
          mediaEmptyLabel={t('media.libraryEmpty')}
          mediaSelectedLabel={t('media.selectedExisting')}
        />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        {locales.map((locale) => (
          <TranslationPanel
            key={locale}
            locale={locale}
            mediaItems={mediaItems}
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
  mediaItems,
  messages,
  translation
}: {
  locale: Locale;
  mediaItems: MediaLibraryItem[];
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
        <ImageUploadField
          label={t('form.ogImage')}
          name={`${locale}.ogImagePath`}
          uploadName={`${locale}.ogImageUpload`}
          defaultValue={translation.ogImagePath}
          uploadLabel={t('page.uploadLocalImage')}
          uploadHint={t('page.uploadLocalImageHint')}
          imageGuide={t('imageGuide.seo')}
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
    </Panel>
  );
}

function getTranslation(item: CollectionItem | undefined, locale: Locale) {
  return (item?.translations[locale] ?? {}) as CollectionTranslation;
}

const collectionCategoryValues = ['champion', 'appointment', 'bespoke'] as const;

function collectionCategoryOptions(t: (key: string) => string) {
  return [
    {value: 'champion', label: t('collection.categoryChampion')},
    {value: 'appointment', label: t('collection.categoryAppointment')},
    {value: 'bespoke', label: t('collection.categoryBespoke')}
  ];
}

function normalizeCollectionCategory(value?: string) {
  return collectionCategoryValues.includes(value as typeof collectionCategoryValues[number])
    ? value
    : 'champion';
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
      year: '',
      sportCategory: '',
      linkHref: '',
      detailImages: []
    };
  }

  const specs = value as Record<string, unknown>;

  return {
    year: typeof specs.year === 'string' ? specs.year : '',
    sportCategory: typeof specs.sportCategory === 'string' ? specs.sportCategory : '',
    linkHref: typeof specs.linkHref === 'string' ? specs.linkHref : '',
    detailImages: normalizeSpecImages(specs.detailImages)
  };
}

function normalizeSpecImages(value: unknown) {
  return Array.isArray(value)
    ? value.filter((image): image is string => typeof image === 'string' && image.trim().length > 0)
    : [];
}
