'use client';

import {useRef, useState} from 'react';

import {sitePopupIsoToDateTimeInput, type SitePopupItem} from '@/lib/site-popup-core.mjs';

import {
  ImageUploadField,
  TextField,
  type MediaLibraryItem
} from './admin-fields';
import {Panel} from './admin-shell';

type SitePopupEditorText = {
  add: string;
  empty: string;
  enabled: string;
  endsAt: string;
  image: string;
  imageGuide: string;
  item: string;
  remove: string;
  startsAt: string;
  timezoneHint: string;
  uploadLabel: string;
  uploadHint: string;
  noImage: string;
  changed: string;
  imageSelected: string;
  mediaSelect: string;
  mediaTitle: string;
  mediaEmpty: string;
  mediaSelected: string;
};

export function SitePopupEditor({
  initialItems,
  mediaItems,
  text
}: {
  initialItems: SitePopupItem[];
  mediaItems: MediaLibraryItem[];
  text: SitePopupEditorText;
}) {
  const sequence = useRef(initialItems.length);
  const [items, setItems] = useState(initialItems);

  const addItem = () => {
    sequence.current += 1;
    setItems((current) => [
      ...current,
      {
        id: `popup-${Date.now()}-${sequence.current}`,
        enabled: false,
        image: '',
        startsAt: '',
        endsAt: ''
      }
    ]);
  };

  return (
    <div className="grid gap-5">
      {items.length === 0 ? (
        <Panel className="p-8 text-center text-sm text-subtext">{text.empty}</Panel>
      ) : null}

      {items.map((item, index) => (
        <Panel key={item.id} className="grid gap-5 p-5">
          <input type="hidden" name="popupId" value={item.id} />
          <div className="flex items-center justify-between gap-4 border-b border-hairline pb-4">
            <h2 className="text-base font-bold text-primary">{text.item} {index + 1}</h2>
            <button
              type="button"
              onClick={() => setItems((current) => current.filter(({id}) => id !== item.id))}
              className="inline-flex min-h-11 min-w-16 items-center justify-center rounded-md border border-accent bg-white px-3 text-sm font-semibold text-accent"
            >
              {text.remove}
            </button>
          </div>

          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-primary">
            <input
              name={`enabled.${item.id}`}
              type="checkbox"
              defaultChecked={item.enabled}
              className="size-4 accent-accent"
            />
            <span>{text.enabled}</span>
          </label>

          <ImageUploadField
            label={text.image}
            name={`image.${item.id}`}
            uploadName={`imageUpload.${item.id}`}
            defaultValue={item.image}
            uploadLabel={text.uploadLabel}
            uploadHint={text.uploadHint}
            emptyLabel={text.noImage}
            changedLabel={text.changed}
            selectedLabel={text.imageSelected}
            mediaItems={mediaItems}
            mediaSelectLabel={text.mediaSelect}
            mediaLibraryTitle={text.mediaTitle}
            mediaEmptyLabel={text.mediaEmpty}
            mediaSelectedLabel={text.mediaSelected}
            imageGuide={text.imageGuide}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label={text.startsAt}
              name={`startsAt.${item.id}`}
              type="datetime-local"
              defaultValue={sitePopupIsoToDateTimeInput(item.startsAt)}
            />
            <TextField
              label={text.endsAt}
              name={`endsAt.${item.id}`}
              type="datetime-local"
              defaultValue={sitePopupIsoToDateTimeInput(item.endsAt)}
            />
          </div>

          <p className="text-sm text-subtext">{text.timezoneHint}</p>
        </Panel>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="min-h-11 rounded-md border border-dashed border-hairline bg-white px-4 text-sm font-bold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        + {text.add}
      </button>
    </div>
  );
}
