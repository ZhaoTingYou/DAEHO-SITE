import Link from 'next/link';

import {saveNewsAction} from '../actions';
import {createAdminTranslator, getContentLocaleLabel} from '@/lib/admin-i18n';
import {locales, type Locale} from '@/lib/locales';
import {
  CheckboxField,
  ImageUploadField,
  type MediaLibraryItem,
  SecondaryLink,
  SubmitButton,
  TextAreaField,
  TextField
} from './admin-fields';
import {Panel} from './admin-shell';

type NewsItem = {
  id: string;
  slug: string;
  category: string;
  imagePath: string;
  publishedAt: string;
  isFeatured: boolean;
  isVisible: boolean;
  sortOrder: number;
  translations: Record<string, unknown>;
};

type NewsTranslation = {
  title?: string;
  categoryLabel?: string;
  excerpt?: string;
  body?: unknown;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  ogImagePath?: string;
};

export function NewsForm({
  item,
  mediaItems,
  messages
}: {
  item?: NewsItem;
  mediaItems: MediaLibraryItem[];
  messages: Record<string, string>;
}) {
  const t = createAdminTranslator(messages);

  return (
    <form action={saveNewsAction} className="grid gap-6">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <Panel className="p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TextField label={t('form.slug')} name="slug" defaultValue={item?.slug} required placeholder="news-slug" />
          <TextField label={t('form.category')} name="category" defaultValue={item?.category} required placeholder="making" />
          <TextField label={t('form.publishedAt')} name="publishedAt" defaultValue={item?.publishedAt} placeholder="2026.00.00" />
          <TextField label={t('common.sortOrder')} name="sortOrder" type="number" defaultValue={item?.sortOrder ?? 0} />
          <CheckboxField label={t('form.featured')} name="isFeatured" defaultChecked={item?.isFeatured ?? false} />
          <CheckboxField label={t('form.visible')} name="isVisible" defaultChecked={item?.isVisible ?? true} />
        </div>
        <div className="mt-4">
          <ImageUploadField
            label={t('form.imageFilename')}
            name="imagePath"
            uploadName="imageUpload"
            defaultValue={item?.imagePath}
            uploadLabel={t('page.uploadLocalImage')}
            uploadHint={t('page.uploadLocalImageHint')}
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
        <Link href="/admin/news" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
          {t('common.cancel')}
        </Link>
        <SubmitButton>{item ? t('form.saveNews') : t('form.createNews')}</SubmitButton>
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
  translation: NewsTranslation;
}) {
  const t = createAdminTranslator(messages);

  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center justify-between border-b border-[#e4e7ec] pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{getContentLocaleLabel(messages, locale)}</h2>
        <SecondaryLink href={`/admin/media`}>{t('common.media')}</SecondaryLink>
      </div>
      <div className="grid gap-4">
        <TextField label={t('form.title')} name={`${locale}.title`} defaultValue={translation.title} required />
        <TextField label={t('form.categoryLabel')} name={`${locale}.categoryLabel`} defaultValue={translation.categoryLabel} />
        <TextAreaField label={t('form.excerpt')} name={`${locale}.excerpt`} defaultValue={translation.excerpt} rows={3} />
        <TextAreaField label={t('form.lead')} name={`${locale}.body.lead`} defaultValue={newsBody(translation.body).lead} rows={3} />
        <TextAreaField label={t('form.paragraphs')} name={`${locale}.body.paragraphs`} defaultValue={newsBody(translation.body).paragraphs.join('\n\n')} rows={8} />
        <TextAreaField label={t('form.quote')} name={`${locale}.body.quote`} defaultValue={newsBody(translation.body).quote} rows={3} />
        <TextField label={t('form.ctaTitle')} name={`${locale}.body.ctaTitle`} defaultValue={newsBody(translation.body).ctaTitle} />
        <TextField label={t('form.tags')} name={`${locale}.tags`} defaultValue={(translation.tags ?? []).join(', ')} placeholder="tag 1, tag 2" />
        <TextField label={t('form.seoTitle')} name={`${locale}.seoTitle`} defaultValue={translation.seoTitle} />
        <TextAreaField label={t('form.seoDescription')} name={`${locale}.seoDescription`} defaultValue={translation.seoDescription} rows={3} />
        <ImageUploadField
          label={t('form.ogImage')}
          name={`${locale}.ogImagePath`}
          uploadName={`${locale}.ogImageUpload`}
          defaultValue={translation.ogImagePath}
          uploadLabel={t('page.uploadLocalImage')}
          uploadHint={t('page.uploadLocalImageHint')}
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

function getTranslation(item: NewsItem | undefined, locale: Locale) {
  return (item?.translations[locale] ?? {}) as NewsTranslation;
}

function newsBody(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      lead: '',
      paragraphs: [],
      quote: '',
      ctaTitle: ''
    };
  }

  const body = value as Record<string, unknown>;

  return {
    lead: typeof body.lead === 'string' ? body.lead : '',
    paragraphs: Array.isArray(body.paragraphs)
      ? body.paragraphs.filter((paragraph): paragraph is string => typeof paragraph === 'string')
      : [],
    quote: typeof body.quote === 'string' ? body.quote : '',
    ctaTitle: typeof body.ctaTitle === 'string' ? body.ctaTitle : ''
  };
}
