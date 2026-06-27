'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode
} from 'react';

const imageUploadSyncEventName = 'deaho-admin-image-upload-sync';

type ImageUploadSyncDetail = {
  syncKey: string;
  source: string;
  file?: File;
  filename: string;
  previewUrl?: string;
};

export type MediaLibraryItem = {
  filename: string;
  url: string;
  alt?: string;
};

export function TextField({
  label,
  name,
  defaultValue,
  type = 'text',
  required = false,
  placeholder
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
      />
    </label>
  );
}

export function TextAreaField({
  label,
  name,
  defaultValue,
  rows = 4,
  required = false,
  placeholder
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
      <span>{label}</span>
      <textarea
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-md border border-[#cbd3df] bg-white px-3 py-2 text-sm leading-6 text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{label: string; value: string}>;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CheckboxField({
  label,
  name,
  defaultChecked
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#344054]">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-[#cbd3df] accent-[#7a2230]"
      />
      <span>{label}</span>
    </label>
  );
}

export function SubmitButton({children}: {children: ReactNode}) {
  return (
    <button className="admin-on-dark min-h-10 rounded-md bg-[#7a2230] px-4 text-sm font-semibold text-[#ffffff] transition hover:bg-[#101827] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230]">
      {children}
    </button>
  );
}

export function SecondaryLink({href, children}: {href: string; children: ReactNode}) {
  return (
    <a
      href={href}
      className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]"
    >
      {children}
    </a>
  );
}

export function DangerButton({children}: {children: ReactNode}) {
  return (
    <button className="min-h-9 rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-3 text-sm font-semibold text-[#b42318] transition hover:bg-[#fee4e2]">
      {children}
    </button>
  );
}

export function ImageUploadField({
  label,
  name,
  uploadName,
  defaultValue,
  placeholder = 'image-name.png',
  uploadLabel,
  uploadHint,
  emptyLabel = '无图片',
  changedLabel = '已更改',
  selectedLabel = '已选择 {filename}，保存后生效。',
  syncedLabel = '已同步选择 {filename}，保存后韩英版本会一起更新。',
  mediaItems = [],
  mediaSelectLabel = '媒体库',
  mediaLibraryTitle = '选择已上传图片',
  mediaEmptyLabel = '还没有媒体',
  mediaSelectedLabel = '已从媒体库选择 {filename}，保存后生效。',
  syncKey,
  preview = true
}: {
  label: string;
  name: string;
  uploadName: string;
  defaultValue?: string;
  placeholder?: string;
  uploadLabel: string;
  uploadHint?: string;
  emptyLabel?: string;
  changedLabel?: string;
  selectedLabel?: string;
  syncedLabel?: string;
  mediaItems?: MediaLibraryItem[];
  mediaSelectLabel?: string;
  mediaLibraryTitle?: string;
  mediaEmptyLabel?: string;
  mediaSelectedLabel?: string;
  syncKey?: string;
  preview?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const filenameInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const initialPreviewUrl = useMemo(() => (defaultValue ? imageSrc(defaultValue) : ''), [defaultValue]);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectionSource, setSelectionSource] = useState<'local' | 'media' | 'synced' | ''>('');
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const previewUrl = selectedPreviewUrl || initialPreviewUrl;

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const previewFile = useCallback(
    (file: File) => {
      releaseObjectUrl();
      const nextUrl = URL.createObjectURL(file);
      objectUrlRef.current = nextUrl;
      setSelectedPreviewUrl(nextUrl);
      return nextUrl;
    },
    [releaseObjectUrl]
  );

  useEffect(() => releaseObjectUrl, [releaseObjectUrl]);

  useEffect(() => {
    if (!syncKey) {
      return undefined;
    }

    const handleSync = (event: Event) => {
      const detail = (event as CustomEvent<ImageUploadSyncDetail>).detail;

      if (!detail || detail.syncKey !== syncKey || detail.source === uploadName) {
        return;
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (filenameInputRef.current) {
        filenameInputRef.current.value = detail.filename;
      }

      if (detail.file) {
        previewFile(detail.file);
      } else {
        releaseObjectUrl();
        setSelectedPreviewUrl(detail.previewUrl ?? imageSrc(detail.filename));
      }

      setSelectedFileName(detail.filename);
      setSelectionSource('synced');
    };

    window.addEventListener(imageUploadSyncEventName, handleSync);

    return () => window.removeEventListener(imageUploadSyncEventName, handleSync);
  }, [previewFile, releaseObjectUrl, syncKey, uploadName]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    updateSuggestedFilename(file.name);
    const targetFilename = filenameInputRef.current?.value.trim() || suggestedUploadFilename(file.name);

    previewFile(file);
    setSelectedFileName(targetFilename);
    setSelectionSource('local');

    if (syncKey) {
      window.dispatchEvent(
        new CustomEvent<ImageUploadSyncDetail>(imageUploadSyncEventName, {
          detail: {
            syncKey,
            source: uploadName,
            file,
            filename: targetFilename
          }
        })
      );
    }
  };

  const updateSuggestedFilename = (filename: string) => {
    const input = filenameInputRef.current;

    if (!input) {
      return;
    }

    const currentValue = input.value.trim();
    const originalValue = (defaultValue ?? '').trim();

    if (currentValue && currentValue !== originalValue) {
      return;
    }

    input.value = suggestedUploadFilename(filename);
  };

  const handleMediaSelect = (item: MediaLibraryItem) => {
    releaseObjectUrl();

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (filenameInputRef.current) {
      filenameInputRef.current.value = item.filename;
    }

    const nextPreviewUrl = item.url || imageSrc(item.filename);
    setSelectedPreviewUrl(nextPreviewUrl);
    setSelectedFileName(item.filename);
    setSelectionSource('media');
    setIsMediaOpen(false);

    if (syncKey) {
      window.dispatchEvent(
        new CustomEvent<ImageUploadSyncDetail>(imageUploadSyncEventName, {
          detail: {
            syncKey,
            source: uploadName,
            filename: item.filename,
            previewUrl: nextPreviewUrl
          }
        })
      );
    }
  };

  const statusText = selectedFileName
    ? formatTemplate(selectionSource === 'synced' ? syncedLabel : selectionSource === 'media' ? mediaSelectedLabel : selectedLabel, selectedFileName)
    : uploadHint;

  return (
    <div className="grid gap-1.5 text-sm font-semibold text-[#344054]">
      <span>{label}</span>
      <div className={`grid gap-3 ${preview ? 'md:grid-cols-[112px_minmax(0,1fr)]' : ''}`}>
        {preview ? (
          <div
            className={`relative aspect-[4/3] overflow-hidden rounded-md border bg-[#eef2f6] transition ${
              selectionSource ? 'border-[#7a2230] ring-2 ring-[#7a2230]/15' : 'border-[#d9dee7]'
            }`}
          >
            {previewUrl ? (
              <div
                aria-label={label}
                role="img"
                className="h-full w-full bg-cover bg-center"
                style={{backgroundImage: `url("${previewUrl}")`}}
              />
            ) : (
              <div className="grid h-full place-items-center text-xs font-semibold text-[#98a2b3]">{emptyLabel}</div>
            )}
            {selectionSource ? (
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[#7a2230] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                {changedLabel}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-2">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              ref={filenameInputRef}
              name={name}
              defaultValue={defaultValue}
              placeholder={placeholder}
              className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
            />
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#344054] transition hover:bg-[#f8fafc]">
              <span className="font-numeric text-base leading-none">+</span>
              <span>{uploadLabel}</span>
              <input
                ref={fileInputRef}
                name={uploadName}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
          </div>
          {mediaItems.length > 0 ? (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setIsMediaOpen((open) => !open)}
                className="inline-flex min-h-10 w-fit items-center rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#344054] transition hover:bg-[#f8fafc]"
              >
                {mediaSelectLabel}
              </button>
              {isMediaOpen ? (
                <div className="rounded-md border border-[#d9dee7] bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#647084]">{mediaLibraryTitle}</p>
                    <button type="button" onClick={() => setIsMediaOpen(false)} className="text-xs font-semibold text-[#7a2230]">
                      x
                    </button>
                  </div>
                  <div className="grid max-h-[280px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                    {mediaItems.map((item) => (
                      <button
                        key={item.filename}
                        type="button"
                        onClick={() => handleMediaSelect(item)}
                        className="group grid gap-1 rounded-md border border-[#e4e7ec] bg-[#f8fafc] p-1 text-left transition hover:border-[#7a2230] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230]"
                      >
                        <span
                          className="block aspect-square rounded bg-[#eef2f6] bg-cover bg-center"
                          style={{backgroundImage: `url("${item.url || imageSrc(item.filename)}")`}}
                        />
                        <span className="line-clamp-2 break-all px-1 pb-1 text-[10px] font-medium leading-3 text-[#647084] group-hover:text-[#7a2230]">
                          {item.filename}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : mediaEmptyLabel ? (
            <p className="text-xs font-medium leading-5 text-[#98a2b3]">{mediaEmptyLabel}</p>
          ) : null}
          {statusText ? (
            <p
              aria-live="polite"
              className={`text-xs font-medium leading-5 ${selectionSource ? 'text-[#7a2230]' : 'text-[#647084]'}`}
            >
              {statusText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function imageSrc(value: string) {
  if (value.startsWith('/')) {
    return value;
  }

  return `/images/${value}`;
}

function formatTemplate(template: string, filename: string) {
  return template.replaceAll('{filename}', filename);
}

function suggestedUploadFilename(filename: string) {
  const dotIndex = filename.lastIndexOf('.');
  const rawBase = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  const extension = dotIndex > 0 ? filename.slice(dotIndex).toLowerCase() : '';
  const baseName = rawBase
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  return `${baseName || 'asset'}${extension}`;
}
