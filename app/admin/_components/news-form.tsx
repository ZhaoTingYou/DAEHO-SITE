import Link from 'next/link';

import {saveNewsAction} from '../actions';
import {
  CheckboxField,
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

export function NewsForm({item}: {item?: NewsItem}) {
  const ko = getTranslation(item, 'ko');
  const en = getTranslation(item, 'en');

  return (
    <form action={saveNewsAction} className="grid gap-6">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <Panel className="p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TextField label="Slug" name="slug" defaultValue={item?.slug} required placeholder="news-slug" />
          <TextField label="Category" name="category" defaultValue={item?.category} required placeholder="making" />
          <TextField label="Image filename" name="imagePath" defaultValue={item?.imagePath} placeholder="news_card_01.png" />
          <TextField label="Published at" name="publishedAt" defaultValue={item?.publishedAt} placeholder="2026.00.00" />
          <TextField label="Sort order" name="sortOrder" type="number" defaultValue={item?.sortOrder ?? 0} />
          <CheckboxField label="Featured" name="isFeatured" defaultChecked={item?.isFeatured ?? false} />
          <CheckboxField label="Visible" name="isVisible" defaultChecked={item?.isVisible ?? true} />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <TranslationPanel locale="ko" title="Korean" translation={ko} />
        <TranslationPanel locale="en" title="English" translation={en} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/admin/news" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
          Cancel
        </Link>
        <SubmitButton>{item ? 'Save news' : 'Create news'}</SubmitButton>
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
  translation: NewsTranslation;
}) {
  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center justify-between border-b border-[#e4e7ec] pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{title}</h2>
        <SecondaryLink href={`/admin/media`}>Media</SecondaryLink>
      </div>
      <div className="grid gap-4">
        <TextField label="Title" name={`${locale}.title`} defaultValue={translation.title} required />
        <TextField label="Category label" name={`${locale}.categoryLabel`} defaultValue={translation.categoryLabel} />
        <TextAreaField label="Excerpt" name={`${locale}.excerpt`} defaultValue={translation.excerpt} rows={3} />
        <TextAreaField
          label="Body JSON"
          name={`${locale}.body`}
          defaultValue={formatJson(translation.body ?? {})}
          rows={9}
          placeholder='{"lead":"","paragraphs":[]}'
        />
        <TextField label="Tags" name={`${locale}.tags`} defaultValue={(translation.tags ?? []).join(', ')} placeholder="tag 1, tag 2" />
        <TextField label="SEO title" name={`${locale}.seoTitle`} defaultValue={translation.seoTitle} />
        <TextAreaField label="SEO description" name={`${locale}.seoDescription`} defaultValue={translation.seoDescription} rows={3} />
        <TextField label="OG image" name={`${locale}.ogImagePath`} defaultValue={translation.ogImagePath} />
      </div>
    </Panel>
  );
}

function getTranslation(item: NewsItem | undefined, locale: 'ko' | 'en') {
  return (item?.translations[locale] ?? {}) as NewsTranslation;
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}
