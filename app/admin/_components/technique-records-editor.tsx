'use client';

import {useState} from 'react';

import {
  minimumTechniqueCarouselItems,
  type TechniqueRecordDraft,
  type TechniqueRecordText
} from '@/lib/cms/technique-records-core.mjs';

import {
  ImageUploadField,
  TextAreaField,
  TextField,
  type MediaLibraryItem
} from './admin-fields';
import {ContentLocalePanel} from './content-locale-editor';

export type TechniqueRecordsEditorLabels = {
  title: string;
  hint: string;
  add: string;
  moveUp: string;
  moveDown: string;
  delete: string;
  confirmDelete: string;
  sharedImage: string;
  ko: string;
  en: string;
  minimumThree: string;
  fieldTitle: string;
  fieldBody: string;
  uploadLabel: string;
  uploadHint: string;
  emptyImageLabel: string;
  changedLabel: string;
  selectedLabel: string;
  syncedLabel: string;
  mediaSelectLabel: string;
  mediaLibraryTitle: string;
  mediaEmptyLabel: string;
  mediaSelectedLabel: string;
};

type EditableTechniqueRecord = TechniqueRecordDraft & {id: string};

type TechniqueRecordsEditorProps = {
  drafts: TechniqueRecordDraft[];
  mediaItems: MediaLibraryItem[];
  imageGuide: string;
  labels: TechniqueRecordsEditorLabels;
};

const blankText = (): TechniqueRecordText => ({title: '', body: ''});

export function TechniqueRecordsEditor({drafts, mediaItems, imageGuide, labels}: TechniqueRecordsEditorProps) {
  const [items, setItems] = useState<EditableTechniqueRecord[]>(() => normalizeDrafts(drafts));

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        image: '',
        ko: blankText(),
        en: blankText()
      }
    ]);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
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

  const removeItem = (index: number) => {
    if (items.length <= minimumTechniqueCarouselItems || !window.confirm(labels.confirmDelete)) {
      return;
    }

    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <section className="grid gap-4 rounded-md border border-[#d9dee7] bg-white p-5">
      <input type="hidden" name="techniqueRecords.ids" value={JSON.stringify(items.map((item) => item.id))} readOnly />
      <input type="hidden" name="techniqueRecords.length" value={items.length} readOnly />

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eef2f6] pb-4">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{labels.title}</h2>
          <p className="mt-1 text-xs font-medium leading-5 text-[#98a2b3]">{labels.hint}</p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230]"
        >
          {labels.add}
        </button>
      </div>

      <div className="grid gap-5">
        {items.map((item, index) => (
            <article key={item.id} className="grid gap-5 rounded-md border border-[#e4e7ec] bg-[#fbfcfe] p-4">
              <input type="hidden" name={contentFieldName('en', index, 'image')} defaultValue={item.image} />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-numeric text-base font-semibold text-[#7a2230]">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-xs font-semibold text-[#344054] transition hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {labels.moveUp}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1}
                    className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-xs font-semibold text-[#344054] transition hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {labels.moveDown}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= minimumTechniqueCarouselItems}
                    title={items.length <= minimumTechniqueCarouselItems ? labels.minimumThree : undefined}
                    className="min-h-10 rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-3 text-xs font-semibold text-[#b42318] transition hover:bg-[#fee4e2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {labels.delete}
                  </button>
                </div>
              </div>

              <ImageUploadField
                label={labels.sharedImage}
                name={contentFieldName('ko', index, 'image')}
                uploadName={`contentImage.ko.main.records.items.${index}.image`}
                defaultValue={item.image}
                uploadLabel={labels.uploadLabel}
                uploadHint={labels.uploadHint}
                emptyLabel={labels.emptyImageLabel}
                changedLabel={labels.changedLabel}
                selectedLabel={labels.selectedLabel}
                syncedLabel={labels.syncedLabel}
                imageGuide={imageGuide}
                mediaItems={mediaItems}
                mediaSelectLabel={labels.mediaSelectLabel}
                mediaLibraryTitle={labels.mediaLibraryTitle}
                mediaEmptyLabel={labels.mediaEmptyLabel}
                mediaSelectedLabel={labels.mediaSelectedLabel}
                syncKey={`technique-record:${item.id}`}
              />

              <div className="grid gap-4">
                <ContentLocalePanel locale="ko">
                  <LocalizedRecordFields locale="ko" index={index} values={item.ko} label={labels.ko} labels={labels} />
                </ContentLocalePanel>
                <ContentLocalePanel locale="en">
                  <LocalizedRecordFields locale="en" index={index} values={item.en} label={labels.en} labels={labels} />
                </ContentLocalePanel>
              </div>
            </article>
        ))}
      </div>

      {items.length <= minimumTechniqueCarouselItems ? (
        <p className="text-xs font-medium text-[#98a2b3]">{labels.minimumThree}</p>
      ) : null}
    </section>
  );
}

function LocalizedRecordFields({
  locale,
  index,
  values,
  label,
  labels
}: {
  locale: 'ko' | 'en';
  index: number;
  values: TechniqueRecordText;
  label: string;
  labels: TechniqueRecordsEditorLabels;
}) {
  return (
    <section className="grid gap-4 rounded-md border border-[#e4e7ec] bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#647084]">{label}</h3>
      <TextField label={labels.fieldTitle} name={contentFieldName(locale, index, 'title')} defaultValue={values.title} editorLocale={locale} />
      <TextAreaField label={labels.fieldBody} name={contentFieldName(locale, index, 'body')} defaultValue={values.body} rows={4} editorLocale={locale} />
    </section>
  );
}

function contentFieldName(locale: 'ko' | 'en', index: number, field: string) {
  return `contentField.${locale}.main.records.items.${index}.${field}`;
}

function normalizeDrafts(drafts: TechniqueRecordDraft[]): EditableTechniqueRecord[] {
  const source = [...drafts];

  while (source.length < minimumTechniqueCarouselItems) {
    source.push({id: '', image: '', ko: blankText(), en: blankText()});
  }

  return source.map((draft, index) => ({
    ...draft,
    id: draft.id || `technique-record-${String(index + 1).padStart(2, '0')}`
  }));
}
