'use client';

import {useState} from 'react';

import type {ExternalSiteItem} from '@/lib/cms/external-sites-core';

type EditorItem = {
  id: string;
  labelKo: string;
  labelEn: string;
  href: string;
  enabled: boolean;
};

export type ExternalSitesEditorLabels = {
  title: string;
  description: string;
  add: string;
  labelKo: string;
  labelEn: string;
  href: string;
  enabled: string;
  moveUp: string;
  moveDown: string;
  remove: string;
  empty: string;
};

type Props = {
  itemsKo: ExternalSiteItem[];
  itemsEn: ExternalSiteItem[];
  labels: ExternalSitesEditorLabels;
};

export function ExternalSitesEditor({itemsKo, itemsEn, labels}: Props) {
  const [items, setItems] = useState(() => alignExternalSiteItems(itemsKo, itemsEn));

  const addItem = () => setItems((current) => [...current, {
    id: crypto.randomUUID(),
    labelKo: '',
    labelEn: '',
    href: '',
    enabled: false
  }]);
  const removeItem = (id: string) =>
    setItems((current) => current.filter((item) => item.id !== id));
  const moveItem = (index: number, offset: -1 | 1) =>
    setItems((current) => reorder(current, index, index + offset));
  const updateItem = (id: string, patch: Partial<EditorItem>) =>
    setItems((current) => current.map((item) => item.id === id ? {...item, ...patch} : item));

  return (
    <section className="grid gap-4 rounded-md border border-[#d9dee7] bg-white p-5">
      <input type="hidden" name="externalSites.payload" value={JSON.stringify(items)} readOnly />

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eef2f6] pb-4">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">
            {labels.title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#98a2b3]">{labels.description}</p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230]"
        >
          {labels.add}
        </button>
      </div>

      {items.length === 0 ? <p className="text-sm text-[#98a2b3]">{labels.empty}</p> : null}

      {items.map((item, index) => (
        <article key={item.id} className="grid gap-4 rounded-md border border-[#eef2f6] bg-[#fbfcfe] p-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[#344054]">
              {labels.labelKo}
              <input
                aria-label={labels.labelKo}
                value={item.labelKo}
                onChange={(event) => updateItem(item.id, {labelKo: event.target.value})}
                className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#344054]"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#344054]">
              {labels.labelEn}
              <input
                aria-label={labels.labelEn}
                value={item.labelEn}
                onChange={(event) => updateItem(item.id, {labelEn: event.target.value})}
                className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#344054]"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-[#344054]">
            {labels.href}
            <input
              aria-label={labels.href}
              inputMode="url"
              value={item.href}
              onChange={(event) => updateItem(item.id, {href: event.target.value})}
              className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#344054]"
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-[#344054]">
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={(event) => updateItem(item.id, {enabled: event.target.checked})}
            />
            {labels.enabled}
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => moveItem(index, -1)}
              className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-xs font-semibold text-[#344054] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {labels.moveUp}
            </button>
            <button
              type="button"
              disabled={index === items.length - 1}
              onClick={() => moveItem(index, 1)}
              className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-xs font-semibold text-[#344054] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {labels.moveDown}
            </button>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="min-h-10 rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-3 text-xs font-semibold text-[#b42318] transition hover:bg-[#fee4e2]"
            >
              {labels.remove}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

function alignExternalSiteItems(itemsKo: ExternalSiteItem[], itemsEn: ExternalSiteItem[]): EditorItem[] {
  const enById = new Map(itemsEn.map((item) => [item.id, item]));
  const koIds = new Set(itemsKo.map((item) => item.id));

  return [
    ...itemsKo.map((item) => toEditorItem(item, enById.get(item.id))),
    ...itemsEn.filter((item) => !koIds.has(item.id)).map((item) => toEditorItem(undefined, item))
  ];
}

function toEditorItem(itemKo: ExternalSiteItem | undefined, itemEn: ExternalSiteItem | undefined): EditorItem {
  const item = itemKo ?? itemEn;

  return {
    id: item?.id ?? '',
    labelKo: itemKo?.label ?? '',
    labelEn: itemEn?.label ?? '',
    href: itemKo?.href || itemEn?.href || '',
    enabled: itemKo?.enabled ?? itemEn?.enabled ?? false
  };
}

function reorder(items: EditorItem[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
