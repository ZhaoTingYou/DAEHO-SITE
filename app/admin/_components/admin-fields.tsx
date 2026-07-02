'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode
} from 'react';

import type {PageArrayItemFieldDefinition} from '@/lib/cms/page-catalog';

const imageUploadSyncEventName = 'daeho-admin-image-upload-sync';

type ImageUploadSyncDetail = {
  syncKey: string;
  source: string;
  file?: File;
  filename: string;
  displayName?: string;
  previewUrl?: string;
};

export type MediaLibraryItem = {
  filename: string;
  url: string;
  alt?: string;
};

type TextEditorFont = 'maruburi-semibold' | 'cormorant-garamond-700';
type TextEditorAlign = 'left' | 'center' | 'right';

const textEditorFonts: Array<{
  value: TextEditorFont;
  label: string;
  style: CSSProperties;
}> = [
  {
    value: 'maruburi-semibold',
    label: 'MaruBuri SemiBold',
    style: {fontFamily: '"MaruBuri", serif', fontWeight: 600}
  },
  {
    value: 'cormorant-garamond-700',
    label: 'Cormorant Garamond 700',
    style: {fontFamily: '"Cormorant Garamond", serif', fontWeight: 700}
  }
];

const textEditorAlignments: Array<{value: TextEditorAlign; label: string}> = [
  {value: 'left', label: 'L'},
  {value: 'center', label: 'C'},
  {value: 'right', label: 'R'}
];

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
  const [font, setFont] = useState<TextEditorFont>(() => defaultTextEditorFont(defaultValue));
  const [align, setAlign] = useState<TextEditorAlign>('left');
  const editableStyle = textEditorStyle(font, align);
  const hasTextControls = type === 'text';

  return (
    <div className="grid gap-1.5 text-sm font-semibold text-[#344054]">
      <TextEditorLabel
        label={label}
        enabled={hasTextControls}
        font={font}
        align={align}
        onFontChange={setFont}
        onAlignChange={setAlign}
      />
      <input
        name={name}
        type={type}
        aria-label={label}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        style={hasTextControls ? editableStyle : undefined}
        className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
      />
    </div>
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
  const [font, setFont] = useState<TextEditorFont>(() => defaultTextEditorFont(defaultValue));
  const [align, setAlign] = useState<TextEditorAlign>('left');
  const editableStyle = textEditorStyle(font, align);

  return (
    <div className="grid gap-1.5 text-sm font-semibold text-[#344054]">
      <TextEditorLabel
        label={label}
        enabled
        font={font}
        align={align}
        onFontChange={setFont}
        onAlignChange={setAlign}
      />
      <textarea
        name={name}
        rows={rows}
        aria-label={label}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        style={editableStyle}
        className="rounded-md border border-[#cbd3df] bg-white px-3 py-2 text-sm leading-6 text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
      />
    </div>
  );
}

function TextEditorLabel({
  label,
  enabled,
  font,
  align,
  onFontChange,
  onAlignChange
}: {
  label: string;
  enabled: boolean;
  font: TextEditorFont;
  align: TextEditorAlign;
  onFontChange: (font: TextEditorFont) => void;
  onAlignChange: (align: TextEditorAlign) => void;
}) {
  if (!enabled) {
    return <span>{label}</span>;
  }

  return (
    <span className="grid gap-2">
      <span>{label}</span>
      <span className="flex flex-wrap items-center gap-2 rounded-md border border-[#e4e7ec] bg-[#f8fafc] p-1.5">
        <select
          aria-label={`${label} font`}
          value={font}
          onChange={(event) => onFontChange(event.target.value as TextEditorFont)}
          className="min-h-8 rounded border border-[#cbd3df] bg-white px-2 text-xs font-semibold text-[#344054] outline-none focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
        >
          {textEditorFonts.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="inline-flex overflow-hidden rounded border border-[#cbd3df] bg-white">
          {textEditorAlignments.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-label={`${label} align ${option.value}`}
              aria-pressed={align === option.value}
              onClick={() => onAlignChange(option.value)}
              className={`min-h-8 min-w-8 px-2 text-xs font-semibold transition ${
                align === option.value ? 'bg-[#7a2230] text-white' : 'text-[#344054] hover:bg-[#f2f4f7]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </span>
      </span>
    </span>
  );
}

function textEditorStyle(font: TextEditorFont, align: TextEditorAlign): CSSProperties {
  const fontStyle = textEditorFonts.find((option) => option.value === font)?.style ?? textEditorFonts[0].style;

  return {
    ...fontStyle,
    textAlign: align
  };
}

function defaultTextEditorFont(value: string | number | undefined): TextEditorFont {
  const text = String(value ?? '');

  if (/[A-Za-z]/.test(text) && !/[가-힣]/.test(text)) {
    return 'cormorant-garamond-700';
  }

  return 'maruburi-semibold';
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
    <button className="inline-flex min-h-11 w-16 items-center justify-center whitespace-nowrap rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-3 text-sm font-semibold leading-none text-[#b42318] transition hover:bg-[#fee4e2]">
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

      setSelectedFileName(detail.displayName ?? detail.filename);
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
    const nextPreviewUrl = mediaPreviewUrl(item);
    const nextFieldValue = mediaFieldValue(item);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (filenameInputRef.current) {
      filenameInputRef.current.value = nextFieldValue;
    }

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
            filename: nextFieldValue,
            displayName: item.filename,
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
                style={mediaPreviewBackground(previewUrl)}
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
                          style={mediaPreviewBackground(mediaPreviewUrl(item))}
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

export function AppendableArrayItemsField({
  path,
  startIndex,
  locale,
  groupKey,
  itemFields,
  mediaItems,
  title,
  hint,
  addButtonLabel,
  removeButtonLabel,
  uploadLabel,
  uploadHint,
  emptyLabel,
  changedLabel,
  selectedLabel,
  syncedLabel,
  mediaSelectLabel,
  mediaLibraryTitle,
  mediaEmptyLabel,
  mediaSelectedLabel
}: {
  path: string;
  startIndex: number;
  locale: string;
  groupKey: string;
  itemFields: PageArrayItemFieldDefinition[];
  mediaItems: MediaLibraryItem[];
  title: string;
  hint: string;
  addButtonLabel: string;
  removeButtonLabel: string;
  uploadLabel: string;
  uploadHint: string;
  emptyLabel: string;
  changedLabel: string;
  selectedLabel: string;
  syncedLabel: string;
  mediaSelectLabel: string;
  mediaLibraryTitle: string;
  mediaEmptyLabel: string;
  mediaSelectedLabel: string;
}) {
  const [rows, setRows] = useState([0]);

  const addRow = () => {
    setRows((current) => [...current, Math.max(...current) + 1]);
  };

  const removeRow = (row: number) => {
    setRows((current) => current.length > 1 ? current.filter((item) => item !== row) : current);
  };

  return (
    <section className="grid gap-4 rounded-md border border-dashed border-[#cbd3df] bg-[#fbfcfe] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">
            {title}
          </h4>
          <p className="mt-1 text-xs font-medium leading-5 text-[#98a2b3]">
            {hint}
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#344054] transition hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230]"
        >
          {addButtonLabel}
        </button>
      </div>
      <div className="grid gap-4">
        {rows.map((row, rowIndex) => {
          const itemIndex = startIndex + rowIndex;

          return (
            <div key={row} className="grid gap-4 rounded-md border border-[#eef2f6] bg-white p-3">
              {rows.length > 1 ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeRow(row)}
                    className="min-h-9 rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-3 text-xs font-semibold text-[#b42318] transition hover:bg-[#fee4e2]"
                  >
                    {removeButtonLabel}
                  </button>
                </div>
              ) : null}
              {itemFields.map((field) => {
                const fieldPath = `${path}.${itemIndex}.${field.path}`;
                const name = contentFieldName(locale, groupKey, fieldPath);

                if (field.type === 'image') {
                  return (
                    <ImageUploadField
                      key={field.path}
                      label={field.label}
                      name={name}
                      uploadName={contentImageFieldName(locale, groupKey, fieldPath)}
                      defaultValue=""
                      placeholder={field.placeholder ?? 'image-name.png'}
                      uploadLabel={uploadLabel}
                      uploadHint={uploadHint}
                      emptyLabel={emptyLabel}
                      changedLabel={changedLabel}
                      selectedLabel={selectedLabel}
                      syncedLabel={syncedLabel}
                      mediaItems={mediaItems}
                      mediaSelectLabel={mediaSelectLabel}
                      mediaLibraryTitle={mediaLibraryTitle}
                      mediaEmptyLabel={mediaEmptyLabel}
                      mediaSelectedLabel={mediaSelectedLabel}
                      syncKey={`page-content:${groupKey}:${fieldPath}`}
                    />
                  );
                }

                if (field.type === 'textarea') {
                  return <TextAreaField key={field.path} label={field.label} name={name} defaultValue="" rows={field.rows ?? 3} />;
                }

                return <TextField key={field.path} label={field.label} name={name} defaultValue="" placeholder={field.placeholder} />;
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function imageSrc(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/uploads/')) {
    return `/images/${trimmed.slice('/uploads/'.length)}`;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  if (trimmed.startsWith('uploads/')) {
    return `/images/${trimmed.slice('uploads/'.length)}`;
  }

  return `/images/${trimmed}`;
}

function mediaFieldValue(item: MediaLibraryItem) {
  const itemUrl = item.url.trim();
  return /^https?:\/\//i.test(itemUrl) ? itemUrl : item.filename;
}

function mediaPreviewUrl(item: MediaLibraryItem) {
  const itemUrl = item.url.trim();
  return /^https?:\/\//i.test(itemUrl) ? itemUrl : imageSrc(item.filename);
}

function mediaPreviewBackground(imageUrl: string): CSSProperties {
  const checkerboard = [
    'linear-gradient(45deg, #d9dee7 25%, transparent 25%)',
    'linear-gradient(-45deg, #d9dee7 25%, transparent 25%)',
    'linear-gradient(45deg, transparent 75%, #d9dee7 75%)',
    'linear-gradient(-45deg, transparent 75%, #d9dee7 75%)'
  ].join(', ');

  return {
    backgroundColor: '#eef2f6',
    backgroundImage: `url("${cssUrl(imageUrl)}"), ${checkerboard}`,
    backgroundPosition: 'center, 0 0, 0 6px, 6px -6px, -6px 0',
    backgroundRepeat: 'no-repeat, repeat, repeat, repeat, repeat',
    backgroundSize: 'cover, 12px 12px, 12px 12px, 12px 12px, 12px 12px'
  };
}

function cssUrl(value: string) {
  return value.replace(/["\\\n\r\f]/g, '\\$&');
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

function contentFieldName(locale: string, groupKey: string, path: string) {
  return `contentField.${locale}.${groupKey}.${path}`;
}

function contentImageFieldName(locale: string, groupKey: string, path: string) {
  return `contentImage.${locale}.${groupKey}.${path}`;
}
