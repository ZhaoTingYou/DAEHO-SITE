'use client';

import {useState} from 'react';

import {ImageUploadField, type MediaLibraryItem} from './admin-fields';

const minCollectionGalleryImages = 1;
const maxCollectionGalleryImages = 6;

type GalleryRow = {
  id: number;
  image: string;
};

export function CollectionGalleryField({
  gallery,
  mediaItems,
  title,
  hint,
  imageLabelTemplate,
  addButtonLabel,
  removeButtonLabel,
  namePrefix = 'gallery',
  uploadPrefix = 'galleryUpload',
  minImages = minCollectionGalleryImages,
  maxImages = maxCollectionGalleryImages,
  uploadLabel,
  uploadHint,
  emptyLabel,
  changedLabel,
  selectedLabel,
  mediaSelectLabel,
  mediaLibraryTitle,
  mediaEmptyLabel,
  mediaSelectedLabel
}: {
  gallery: string[];
  mediaItems: MediaLibraryItem[];
  title: string;
  hint: string;
  imageLabelTemplate: string;
  addButtonLabel: string;
  removeButtonLabel: string;
  namePrefix?: string;
  uploadPrefix?: string;
  minImages?: number;
  maxImages?: number;
  uploadLabel: string;
  uploadHint: string;
  emptyLabel: string;
  changedLabel: string;
  selectedLabel: string;
  mediaSelectLabel: string;
  mediaLibraryTitle: string;
  mediaEmptyLabel: string;
  mediaSelectedLabel: string;
}) {
  const [rows, setRows] = useState<GalleryRow[]>(() => initialGalleryRows(gallery, minImages, maxImages));
  const canAdd = rows.length < maxImages;
  const canRemove = rows.length > minImages;

  const addRow = () => {
    setRows((current) => {
      if (current.length >= maxImages) {
        return current;
      }

      const nextId = Math.max(-1, ...current.map((row) => row.id)) + 1;
      return [...current, {id: nextId, image: ''}];
    });
  };

  const removeRow = (rowId: number) => {
    setRows((current) =>
      current.length > minImages
        ? current.filter((row) => row.id !== rowId)
        : current
    );
  };

  return (
    <section className="mt-4 grid gap-3 rounded-md border border-[#e4e7ec] bg-[#f8fafc] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{title}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-[#647084]">{hint}</p>
        </div>
        <button
          type="button"
          onClick={addRow}
          disabled={!canAdd}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#344054] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {addButtonLabel}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row, index) => (
          <div key={row.id} className="grid gap-3 rounded-md border border-[#e4e7ec] bg-white p-3">
            {canRemove ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="min-h-9 rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-3 text-xs font-semibold text-[#b42318] transition hover:bg-[#fee4e2]"
                >
                  {removeButtonLabel}
                </button>
              </div>
            ) : null}
            <ImageUploadField
              label={formatGalleryLabel(imageLabelTemplate, index + 1)}
              name={`${namePrefix}.${index}`}
              uploadName={`${uploadPrefix}.${index}`}
              defaultValue={row.image}
              uploadLabel={uploadLabel}
              uploadHint={uploadHint}
              emptyLabel={emptyLabel}
              changedLabel={changedLabel}
              selectedLabel={selectedLabel}
              mediaItems={mediaItems}
              mediaSelectLabel={mediaSelectLabel}
              mediaLibraryTitle={mediaLibraryTitle}
              mediaEmptyLabel={mediaEmptyLabel}
              mediaSelectedLabel={mediaSelectedLabel}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function initialGalleryRows(gallery: string[], minImages: number, maxImages: number) {
  const images = gallery
    .filter((image) => image.trim().length > 0)
    .slice(0, maxImages);
  const emptyRows = Array.from({length: Math.max(0, minImages)}, () => '');
  const initialImages = images.length > 0 ? images : emptyRows;

  return initialImages.map((image, index) => ({id: index, image}));
}

function formatGalleryLabel(template: string, count: number) {
  return template.replaceAll('{count}', String(count));
}
