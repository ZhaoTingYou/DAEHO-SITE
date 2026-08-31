import Link from 'next/link';

import {saveNewsAction} from '../actions';
import {createAdminTranslator, getContentLocaleLabel} from '@/lib/admin-i18n';
import {locales, type Locale} from '@/lib/locales';
import {
  CheckboxField,
  type MediaLibraryItem,
  ResponsiveImageUploadField,
  SecondaryLink,
  SubmitButton,
  TextAreaField,
  TextField
} from './admin-fields';
import {Panel} from './admin-shell';
import {
  NewsBlocksEditor,
  type NewsBodyBlock,
  type NewsBlocksEditorLabels
} from './news-blocks-editor';
import {ContentLocaleForm, ContentLocalePanel} from './content-locale-editor';

type NewsItem = {
  id: string;
  slug: string;
  category: string;
  imagePath: string;
  mobileImagePath: string;
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
    <ContentLocaleForm
      action={saveNewsAction}
      className="grid gap-6"
      label={t('contentLocale.editorLabel')}
      localeLabels={{
        ko: t('contentLocale.ko'),
        en: t('contentLocale.en')
      }}
    >
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
          <ResponsiveImageUploadField
            label={t('form.imageFilename')}
            desktopLabel={t('page.desktopImage')}
            mobileLabel={t('page.mobileImage')}
            desktopName="imagePath"
            desktopUploadName="imageUpload"
            desktopDefaultValue={item?.imagePath}
            mobileName="mobileImagePath"
            mobileUploadName="mobileImageUpload"
            mobileDefaultValue={item?.mobileImagePath}
            uploadLabel={t('page.uploadLocalImage')}
            uploadHint={t('page.uploadLocalImageHint')}
            desktopImageGuide={t('imageGuide.newsCover')}
            mobileImageGuide={t('imageGuide.newsMobileCover')}
            emptyLabel={t('common.noImage')}
            changedLabel={t('common.changed')}
            selectedLabel={t('common.imageSelected')}
            syncedLabel={t('common.imageSynced')}
            mediaItems={mediaItems}
            mediaSelectLabel={t('media.selectFromLibrary')}
            mediaLibraryTitle={t('media.libraryTitle')}
            mediaEmptyLabel={t('media.libraryEmpty')}
            mediaSelectedLabel={t('media.selectedExisting')}
            clearLabel={t('page.clearMobileImage')}
            clearedLabel={t('page.mobileImageCleared')}
            fallbackHint={t('page.mobileImageFallback')}
          />
        </div>
      </Panel>

      <div className="grid gap-6">
        {locales.map((locale) => (
          <ContentLocalePanel key={locale} locale={locale}>
            <TranslationPanel
              locale={locale}
              mediaItems={mediaItems}
              messages={messages}
              translation={getTranslation(item, locale)}
            />
          </ContentLocalePanel>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/admin/news" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
          {t('common.cancel')}
        </Link>
        <SubmitButton>{item ? t('form.saveNews') : t('form.createNews')}</SubmitButton>
      </div>
    </ContentLocaleForm>
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
  const body = newsBody(translation.body);

  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center justify-between border-b border-[#e4e7ec] pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{getContentLocaleLabel(messages, locale)}</h2>
        <SecondaryLink href="/admin/media">{t('common.media')}</SecondaryLink>
      </div>
      <div className="grid gap-4">
        <TextField label={t('form.title')} name={`${locale}.title`} defaultValue={translation.title} required />
        <TextField label={t('form.categoryLabel')} name={`${locale}.categoryLabel`} defaultValue={translation.categoryLabel} />
        <TextAreaField label={t('form.excerpt')} name={`${locale}.excerpt`} defaultValue={translation.excerpt} rows={3} />
        <NewsBlocksEditor
          locale={locale}
          blocks={body.blocks}
          mediaItems={mediaItems}
          labels={newsBlocksEditorLabels(t)}
        />
        <TextField label={t('form.ctaTitle')} name={`${locale}.body.ctaTitle`} defaultValue={body.ctaTitle} />
        <TextField
          label={t('form.ctaHref')}
          name={`${locale}.body.ctaHref`}
          defaultValue={body.ctaHref}
          placeholder="/contact?item={slug}, https://…"
          inputMode="url"
        />
        <TextField label={t('form.tags')} name={`${locale}.tags`} defaultValue={(translation.tags ?? []).join(', ')} placeholder="tag 1, tag 2" />
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
      blocks: [],
      ctaTitle: '',
      ctaHref: ''
    };
  }

  const body = value as Record<string, unknown>;

  return {
    blocks: normalizeNewsBlocks(body.blocks),
    ctaTitle: typeof body.ctaTitle === 'string' ? body.ctaTitle : '',
    ctaHref: typeof body.ctaHref === 'string' ? body.ctaHref : ''
  };
}

function normalizeNewsBlocks(value: unknown): NewsBodyBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const block = item as Record<string, unknown>;
      const title = stringValue(block.title);
      const body = stringValue(block.body);
      const image = stringValue(block.image);

      if (!title && !body && !image) {
        return null;
      }

      return {
        type: block.type === 'imageFull' || block.type === 'imageCentered' || block.type === 'imageText' || block.type === 'quote'
          ? block.type
          : 'text',
        title,
        body,
        image,
        layout: block.layout === 'imageRight' ? 'imageRight' : 'imageLeft',
        width: block.width === 'narrow' || block.width === 'wide' ? block.width : 'standard',
        spacing: block.spacing === 'compact' || block.spacing === 'loose' ? block.spacing : 'default'
      };
    })
    .filter((block): block is NewsBodyBlock => block !== null);
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function newsBlocksEditorLabels(t: ReturnType<typeof createAdminTranslator>): NewsBlocksEditorLabels {
  return {
    title: t('newsBlocks.title'),
    hint: t('newsBlocks.hint'),
    addBlock: t('newsBlocks.add'),
    closePicker: t('newsBlocks.closePicker'),
    layoutPickerTitle: t('newsBlocks.layoutPickerTitle'),
    layoutPickerHint: t('newsBlocks.layoutPickerHint'),
    removeBlock: t('newsBlocks.remove'),
    moveUp: t('newsBlocks.up'),
    moveDown: t('newsBlocks.down'),
    type: t('newsBlocks.type'),
    blockTitle: t('newsBlocks.blockTitle'),
    body: t('newsBlocks.body'),
    image: t('newsBlocks.image'),
    layout: t('newsBlocks.layout'),
    width: t('newsBlocks.width'),
    spacing: t('newsBlocks.spacing'),
    empty: t('newsBlocks.empty'),
    typeText: t('newsBlocks.typeText'),
    typeImageFull: t('newsBlocks.typeImageFull'),
    typeImageCentered: t('newsBlocks.typeImageCentered'),
    typeImageText: t('newsBlocks.typeImageText'),
    typeQuote: t('newsBlocks.typeQuote'),
    layoutImageLeft: t('newsBlocks.layoutImageLeft'),
    layoutImageRight: t('newsBlocks.layoutImageRight'),
    presetTextDescription: t('newsBlocks.presetTextDescription'),
    presetImageFullDescription: t('newsBlocks.presetImageFullDescription'),
    presetImageCenteredDescription: t('newsBlocks.presetImageCenteredDescription'),
    presetImageLeftDescription: t('newsBlocks.presetImageLeftDescription'),
    presetImageRightDescription: t('newsBlocks.presetImageRightDescription'),
    presetQuoteDescription: t('newsBlocks.presetQuoteDescription'),
    widthNarrow: t('newsBlocks.widthNarrow'),
    widthStandard: t('newsBlocks.widthStandard'),
    widthWide: t('newsBlocks.widthWide'),
    spacingCompact: t('newsBlocks.spacingCompact'),
    spacingDefault: t('newsBlocks.spacingDefault'),
    spacingLoose: t('newsBlocks.spacingLoose'),
    uploadLabel: t('page.uploadLocalImage'),
    uploadHint: t('page.uploadLocalImageHint'),
    imageGuide: t('imageGuide.newsBlock'),
    emptyImageLabel: t('common.noImage'),
    changedLabel: t('common.changed'),
    selectedLabel: t('common.imageSelected'),
    mediaSelectLabel: t('media.selectFromLibrary'),
    mediaLibraryTitle: t('media.libraryTitle'),
    mediaEmptyLabel: t('media.libraryEmpty'),
    mediaSelectedLabel: t('media.selectedExisting')
  };
}
