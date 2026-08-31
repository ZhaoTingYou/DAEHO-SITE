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
  type: 'text' | 'imageFull' | 'imageCentered' | 'imageText' | 'quote';
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
  closePicker: string;
  layoutPickerTitle: string;
  layoutPickerHint: string;
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
  typeImageCentered: string;
  typeImageText: string;
  typeQuote: string;
  layoutImageLeft: string;
  layoutImageRight: string;
  presetTextDescription: string;
  presetImageFullDescription: string;
  presetImageCenteredDescription: string;
  presetImageLeftDescription: string;
  presetImageRightDescription: string;
  presetQuoteDescription: string;
  widthNarrow: string;
  widthStandard: string;
  widthWide: string;
  spacingCompact: string;
  spacingDefault: string;
  spacingLoose: string;
  uploadLabel: string;
  uploadHint: string;
  imageGuide: string;
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

type NewsBlockPreset = {
  id: 'text' | 'imageFull' | 'imageCentered' | 'imageTextLeft' | 'imageTextRight' | 'quote';
  type: NewsBodyBlock['type'];
  layout: NewsBodyBlock['layout'];
  width: NewsBodyBlock['width'];
};

const blockPresets: NewsBlockPreset[] = [
  {id: 'text', type: 'text', layout: 'imageLeft', width: 'narrow'},
  {id: 'imageFull', type: 'imageFull', layout: 'imageLeft', width: 'wide'},
  {id: 'imageCentered', type: 'imageCentered', layout: 'imageLeft', width: 'narrow'},
  {id: 'imageTextLeft', type: 'imageText', layout: 'imageLeft', width: 'standard'},
  {id: 'imageTextRight', type: 'imageText', layout: 'imageRight', width: 'standard'},
  {id: 'quote', type: 'quote', layout: 'imageLeft', width: 'narrow'}
];

export function NewsBlocksEditor({locale, blocks, mediaItems, labels}: NewsBlocksEditorProps) {
  const [items, setItems] = useState<EditableNewsBodyBlock[]>(() =>
    blocks.map((block, index) => ({
      ...normalizeBlock(block),
      key: `existing-${index}`
    }))
  );
  const [isLayoutPickerOpen, setIsLayoutPickerOpen] = useState(false);

  const addBlock = (preset: NewsBlockPreset) => {
    setItems((current) => [
      ...current,
      {
        key: `new-${Date.now()}-${current.length}`,
        type: preset.type,
        title: '',
        body: '',
        image: '',
        layout: preset.layout,
        width: preset.width,
        spacing: 'default'
      }
    ]);
    setIsLayoutPickerOpen(false);
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
          aria-expanded={isLayoutPickerOpen}
          onClick={() => setIsLayoutPickerOpen((current) => !current)}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#344054] transition hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230]"
        >
          {isLayoutPickerOpen ? labels.closePicker : labels.addBlock}
        </button>
      </div>

      {isLayoutPickerOpen ? (
        <div className="rounded-md border border-[#d9dee7] bg-white p-4 shadow-sm">
          <div>
            <h4 className="text-sm font-semibold text-[#101827]">{labels.layoutPickerTitle}</h4>
            <p className="mt-1 text-xs leading-5 text-[#647084]">{labels.layoutPickerHint}</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {blockPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => addBlock(preset)}
                className="group rounded-md border border-[#d9dee7] bg-[#fbfcfe] p-3 text-left transition hover:border-[#7a2230] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230]"
              >
                <BlockLayoutPreview preset={preset} />
                <span className="mt-3 block text-sm font-semibold text-[#101827] group-hover:text-[#7a2230]">
                  {blockPresetLabel(preset, labels)}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#647084]">
                  {blockPresetDescription(preset, labels)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-md border border-[#e4e7ec] bg-white px-4 py-5 text-sm font-medium text-[#647084]">{labels.empty}</p>
      ) : null}

      <div className="grid gap-4">
        {items.map((block, index) => (
          <div key={block.key} className="grid gap-4 rounded-md border border-[#e4e7ec] bg-white p-4">
            <input type="hidden" name={`${locale}.body.blocks.${index}.type`} value={block.type} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#647084]">
                {index + 1}. {blockTypeLabel(block, labels)}
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

            <div className="grid gap-3 md:grid-cols-3">
              {block.type === 'imageText' ? (
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
              ) : (
                <input type="hidden" name={`${locale}.body.blocks.${index}.layout`} value={block.layout} />
              )}

              {block.type !== 'imageCentered' && block.type !== 'imageFull' ? (
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
              ) : (
                <input
                  type="hidden"
                  name={`${locale}.body.blocks.${index}.width`}
                  value={block.type === 'imageFull' ? block.width : 'narrow'}
                />
              )}

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

            {block.type === 'text' || block.type === 'imageFull' || block.type === 'imageText' ? (
              <>
                <TextField label={labels.blockTitle} name={`${locale}.body.blocks.${index}.title`} defaultValue={block.title} />
                <TextAreaField label={labels.body} name={`${locale}.body.blocks.${index}.body`} defaultValue={block.body} rows={5} />
              </>
            ) : block.type === 'quote' ? (
              <>
                <input type="hidden" name={`${locale}.body.blocks.${index}.title`} value={block.title} />
                <TextAreaField label={labels.body} name={`${locale}.body.blocks.${index}.body`} defaultValue={block.body} rows={4} />
              </>
            ) : (
              <>
                <input type="hidden" name={`${locale}.body.blocks.${index}.title`} value="" />
                <input type="hidden" name={`${locale}.body.blocks.${index}.body`} value="" />
              </>
            )}

            {block.type === 'imageFull' || block.type === 'imageCentered' || block.type === 'imageText' ? (
              <ImageUploadField
                label={labels.image}
                name={`${locale}.body.blocks.${index}.image`}
                uploadName={`${locale}.body.blocks.${index}.imageUpload`}
                defaultValue={block.image}
                uploadLabel={labels.uploadLabel}
                uploadHint={labels.uploadHint}
                imageGuide={labels.imageGuide}
                emptyLabel={labels.emptyImageLabel}
                changedLabel={labels.changedLabel}
                selectedLabel={labels.selectedLabel}
                mediaItems={mediaItems}
                mediaSelectLabel={labels.mediaSelectLabel}
                mediaLibraryTitle={labels.mediaLibraryTitle}
                mediaEmptyLabel={labels.mediaEmptyLabel}
                mediaSelectedLabel={labels.mediaSelectedLabel}
              />
            ) : (
              <input type="hidden" name={`${locale}.body.blocks.${index}.image`} value={block.image} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function BlockLayoutPreview({preset}: {preset: NewsBlockPreset}) {
  const textLines = (
    <span className="flex h-full flex-col justify-center gap-2" aria-hidden="true">
      <span className="h-2 w-full rounded-full bg-[#667085]" />
      <span className="h-2 w-4/5 rounded-full bg-[#98a2b3]" />
      <span className="h-2 w-2/3 rounded-full bg-[#c5cad3]" />
    </span>
  );
  const image = <span className="block h-full min-h-12 rounded-sm bg-[#b7c0cc]" aria-hidden="true" />;

  if (preset.id === 'imageFull') {
    return <span className="block h-24 rounded-sm bg-[#b7c0cc]" aria-hidden="true" />;
  }

  if (preset.id === 'imageCentered') {
    return (
      <span className="block h-24 rounded-sm border border-[#e4e7ec] bg-[#f8f6f2] p-2" aria-hidden="true">
        <span className="mx-auto block h-full w-3/5 rounded-sm bg-[#b7c0cc]" />
      </span>
    );
  }

  if (preset.id === 'imageTextLeft' || preset.id === 'imageTextRight') {
    return (
      <span className="grid h-24 grid-cols-2 gap-3 rounded-sm border border-[#e4e7ec] bg-[#f8f6f2] p-3" aria-hidden="true">
        {preset.id === 'imageTextLeft' ? <>{image}{textLines}</> : <>{textLines}{image}</>}
      </span>
    );
  }

  if (preset.id === 'quote') {
    return (
      <span className="flex h-24 items-center gap-3 rounded-sm border-y-2 border-[#7a2230]/45 bg-[#f8f6f2] px-4" aria-hidden="true">
        <span className="font-heading text-4xl leading-none text-[#7a2230]">“</span>
        <span className="grid flex-1 gap-2">
          <span className="h-2 w-full rounded-full bg-[#667085]" />
          <span className="h-2 w-3/4 rounded-full bg-[#98a2b3]" />
        </span>
      </span>
    );
  }

  return (
    <span className="block h-24 rounded-sm border border-[#e4e7ec] bg-[#f8f6f2] px-5 py-3" aria-hidden="true">
      {textLines}
    </span>
  );
}

function normalizeBlock(block: NewsBodyBlock): NewsBodyBlock {
  return {
    type: block.type === 'imageFull' || block.type === 'imageCentered' || block.type === 'imageText' || block.type === 'quote'
      ? block.type
      : 'text',
    title: block.title ?? '',
    body: block.body ?? '',
    image: block.image ?? '',
    layout: block.layout === 'imageRight' ? 'imageRight' : 'imageLeft',
    width: block.width === 'narrow' || block.width === 'wide' ? block.width : 'standard',
    spacing: block.spacing === 'compact' || block.spacing === 'loose' ? block.spacing : 'default'
  };
}

function blockTypeLabel(block: NewsBodyBlock, labels: NewsBlocksEditorLabels) {
  if (block.type === 'imageFull') {
    return labels.typeImageFull;
  }

  if (block.type === 'imageCentered') {
    return labels.typeImageCentered;
  }

  if (block.type === 'imageText') {
    return block.layout === 'imageRight' ? labels.layoutImageRight : labels.layoutImageLeft;
  }

  if (block.type === 'quote') {
    return labels.typeQuote;
  }

  return labels.typeText;
}

function blockPresetLabel(preset: NewsBlockPreset, labels: NewsBlocksEditorLabels) {
  if (preset.id === 'imageTextLeft') {
    return labels.layoutImageLeft;
  }

  if (preset.id === 'imageTextRight') {
    return labels.layoutImageRight;
  }

  return blockTypeLabel({...preset, title: '', body: '', image: '', spacing: 'default'}, labels);
}

function blockPresetDescription(preset: NewsBlockPreset, labels: NewsBlocksEditorLabels) {
  if (preset.id === 'imageFull') {
    return labels.presetImageFullDescription;
  }

  if (preset.id === 'imageCentered') {
    return labels.presetImageCenteredDescription;
  }

  if (preset.id === 'imageTextLeft') {
    return labels.presetImageLeftDescription;
  }

  if (preset.id === 'imageTextRight') {
    return labels.presetImageRightDescription;
  }

  if (preset.id === 'quote') {
    return labels.presetQuoteDescription;
  }

  return labels.presetTextDescription;
}
