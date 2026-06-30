'use client';

import {useState} from 'react';

import type {Locale} from '@/lib/locales';

import {
  ImageUploadField,
  TextAreaField,
  TextField,
  type MediaLibraryItem
} from './admin-fields';

export type NewsBodyBlock = {
  type: 'text' | 'imageFull' | 'imageText' | 'quote';
  title: string;
  body: string;
  image: string;
  layout: 'imageLeft' | 'imageRight';
  width: 'narrow' | 'standard' | 'wide';
  spacing: 'compact' | 'default' | 'loose';
};

export type NewsBlocksEditorLabels = {
  title: string;
  hint: string;
  addBlock: string;
  removeBlock: string;
  moveUp: string;
  moveDown: string;
  type: string;
  blockTitle: string;
  body: string;
  image: string;
  layout: string;
  width: string;
  spacing: string;
  empty: string;
  typeText: string;
  typeImageFull: string;
  typeImageText: string;
  typeQuote: string;
  layoutImageLeft: string;
  layoutImageRight: string;
  widthNarrow: string;
  widthStandard: string;
  widthWide: string;
  spacingCompact: string;
  spacingDefault: string;
  spacingLoose: string;
  uploadLabel: string;
  uploadHint: string;
  emptyImageLabel: string;
  changedLabel: string;
  selectedLabel: string;
  mediaSelectLabel: string;
  mediaLibraryTitle: string;
  mediaEmptyLabel: string;
  mediaSelectedLabel: string;
};

type EditableNewsBodyBlock = NewsBodyBlock & {
  key: string;
};

type NewsBlocksEditorProps = {
  locale: Locale;
  blocks: NewsBodyBlock[];
  mediaItems: MediaLibraryItem[];
  labels: NewsBlocksEditorLabels;
};

export function NewsBlocksEditor({locale, blocks, mediaItems, labels}: NewsBlocksEditorProps) {
  const [items, setItems] = useState<EditableNewsBodyBlock[]>(() =>
    blocks.map((block, index) => ({
      ...normalizeBlock(block),
      key: `existing-${index}`
    }))
  );

  const addBlock = () => {
    setItems((current) => [
      ...current,
      {
        key: `new-${Date.now()}-${current.length}`,
        type: 'imageText',
        title: '',
        body: '',
        image: '',
        layout: 'imageLeft',
        width: 'standard',
        spacing: 'default'
      }
    ]);
  };

  const removeBlock = (index: number) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const updateBlock = (index: number, patch: Partial<NewsBodyBlock>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, ...patch} : item));
  };

  return (
    <section className="grid gap-4 rounded-md border border-dashed border-[#cbd3df] bg-[#fbfcfe] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{labels.title}</h3>
          <p className="mt-1 text-xs font-medium leading-5 text-[#98a2b3]">{labels.hint}</p>
        </div>
        <button
          type="button"
          onClick={addBlock}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#344054] transition hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230]"
        >
          {labels.addBlock}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-[#e4e7ec] bg-white px-4 py-5 text-sm font-medium text-[#647084]">{labels.empty}</p>
      ) : null}

      <div className="grid gap-4">
        {items.map((block, index) => (
          <div key={block.key} className="grid gap-4 rounded-md border border-[#e4e7ec] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#647084]">
                {index + 1}. {blockTypeLabel(block.type, labels)}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => moveBlock(index, -1)}
                  disabled={index === 0}
                  className="min-h-9 rounded-md border border-[#cbd3df] bg-white px-3 text-xs font-semibold text-[#344054] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {labels.moveUp}
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(index, 1)}
                  disabled={index === items.length - 1}
                  className="min-h-9 rounded-md border border-[#cbd3df] bg-white px-3 text-xs font-semibold text-[#344054] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {labels.moveDown}
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(index)}
                  className="min-h-9 rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-3 text-xs font-semibold text-[#b42318] transition hover:bg-[#fee4e2]"
                >
                  {labels.removeBlock}
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
                <span>{labels.type}</span>
                <select
                  name={`${locale}.body.blocks.${index}.type`}
                  value={block.type}
                  onChange={(event) => updateBlock(index, {type: event.currentTarget.value as NewsBodyBlock['type']})}
                  className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
                >
                  <option value="text">{labels.typeText}</option>
                  <option value="imageFull">{labels.typeImageFull}</option>
                  <option value="imageText">{labels.typeImageText}</option>
                  <option value="quote">{labels.typeQuote}</option>
                </select>
              </label>

              <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
                <span>{labels.layout}</span>
                <select
                  name={`${locale}.body.blocks.${index}.layout`}
                  value={block.layout}
                  onChange={(event) => updateBlock(index, {layout: event.currentTarget.value as NewsBodyBlock['layout']})}
                  className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
                >
                  <option value="imageLeft">{labels.layoutImageLeft}</option>
                  <option value="imageRight">{labels.layoutImageRight}</option>
                </select>
              </label>

              <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
                <span>{labels.width}</span>
                <select
                  name={`${locale}.body.blocks.${index}.width`}
                  value={block.width}
                  onChange={(event) => updateBlock(index, {width: event.currentTarget.value as NewsBodyBlock['width']})}
                  className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
                >
                  <option value="narrow">{labels.widthNarrow}</option>
                  <option value="standard">{labels.widthStandard}</option>
                  <option value="wide">{labels.widthWide}</option>
                </select>
              </label>

              <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
                <span>{labels.spacing}</span>
                <select
                  name={`${locale}.body.blocks.${index}.spacing`}
                  value={block.spacing}
                  onChange={(event) => updateBlock(index, {spacing: event.currentTarget.value as NewsBodyBlock['spacing']})}
                  className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
                >
                  <option value="compact">{labels.spacingCompact}</option>
                  <option value="default">{labels.spacingDefault}</option>
                  <option value="loose">{labels.spacingLoose}</option>
                </select>
              </label>
            </div>

            <TextField label={labels.blockTitle} name={`${locale}.body.blocks.${index}.title`} defaultValue={block.title} />
            <TextAreaField label={labels.body} name={`${locale}.body.blocks.${index}.body`} defaultValue={block.body} rows={5} />

            {block.type === 'imageFull' || block.type === 'imageText' ? (
              <ImageUploadField
                label={labels.image}
                name={`${locale}.body.blocks.${index}.image`}
                uploadName={`${locale}.body.blocks.${index}.imageUpload`}
                defaultValue={block.image}
                uploadLabel={labels.uploadLabel}
                uploadHint={labels.uploadHint}
                emptyLabel={labels.emptyImageLabel}
                changedLabel={labels.changedLabel}
                selectedLabel={labels.selectedLabel}
                mediaItems={mediaItems}
                mediaSelectLabel={labels.mediaSelectLabel}
                mediaLibraryTitle={labels.mediaLibraryTitle}
                mediaEmptyLabel={labels.mediaEmptyLabel}
                mediaSelectedLabel={labels.mediaSelectedLabel}
              />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function normalizeBlock(block: NewsBodyBlock): NewsBodyBlock {
  return {
    type: block.type === 'imageFull' || block.type === 'imageText' || block.type === 'quote' ? block.type : 'text',
    title: block.title ?? '',
    body: block.body ?? '',
    image: block.image ?? '',
    layout: block.layout === 'imageRight' ? 'imageRight' : 'imageLeft',
    width: block.width === 'narrow' || block.width === 'wide' ? block.width : 'standard',
    spacing: block.spacing === 'compact' || block.spacing === 'loose' ? block.spacing : 'default'
  };
}

function blockTypeLabel(type: NewsBodyBlock['type'], labels: NewsBlocksEditorLabels) {
  if (type === 'imageFull') {
    return labels.typeImageFull;
  }

  if (type === 'imageText') {
    return labels.typeImageText;
  }

  if (type === 'quote') {
    return labels.typeQuote;
  }

  return labels.typeText;
}
