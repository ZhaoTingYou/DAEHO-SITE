'use client';

import {useState} from 'react';

import {fetchAdminApi} from '@/lib/cms/admin-api-client.mjs';
import type {CmsInquiryStatusDefinition} from '@/lib/cms/repositories';

type Copy = {
  addStatus: string;
  code: string;
  codeHint: string;
  labelKo: string;
  labelEn: string;
  labelZh: string;
  color: string;
  colorLabels: Record<(typeof colors)[number], string>;
  sortOrder: string;
  active: string;
  system: string;
  custom: string;
  save: string;
  create: string;
  saving: string;
  saved: string;
  created: string;
  error: string;
  notificationNote: string;
};

const colors = ['slate', 'blue', 'amber', 'green', 'red', 'purple'] as const;

export function InquiryStatusManager({
  initialStatuses,
  copy
}: {
  initialStatuses: CmsInquiryStatusDefinition[];
  copy: Copy;
}) {
  const [statuses, setStatuses] = useState(initialStatuses);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
        <h2 className="font-heading text-2xl font-semibold text-[#101827]">{copy.addStatus}</h2>
        <p className="mt-2 text-sm leading-6 text-[#647084]">{copy.notificationNote}</p>
        <form
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const payload = formPayload(new FormData(form), true);
            setSaving('new');
            setMessage('');
            setError('');
            const response = await fetchAdminApi('/api/admin/inquiry-statuses', {
              method: 'POST',
              headers: {'content-type': 'application/json'},
              body: JSON.stringify(payload)
            }).catch(() => null);
            setSaving('');
            if (!response?.ok) {
              setError(await responseError(response, copy.error));
              return;
            }
            const result = await response.json() as {item: CmsInquiryStatusDefinition};
            setStatuses((items) => [...items, result.item].sort(compareStatuses));
            form.reset();
            setMessage(copy.created);
          }}
        >
          <TextField name="code" label={copy.code} hint={copy.codeHint} required pattern="[a-z][a-z0-9_]{0,31}" />
          <TextField name="labelKo" label={copy.labelKo} required />
          <TextField name="labelEn" label={copy.labelEn} />
          <TextField name="labelZh" label={copy.labelZh} />
          <SelectField name="color" label={copy.color} defaultValue="slate" colorLabels={copy.colorLabels} />
          <NumberField name="sortOrder" label={copy.sortOrder} defaultValue={statuses.length * 10} />
          <label className="flex min-h-11 items-center gap-2 self-end rounded-md border border-[#d9dee7] px-3 text-sm font-semibold text-[#344054]">
            <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 accent-[#7a2230]" />
            {copy.active}
          </label>
          <button
            disabled={saving === 'new'}
            className="admin-on-dark min-h-11 self-end rounded-md bg-[#101827] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving === 'new' ? copy.saving : copy.create}
          </button>
        </form>
      </section>

      <div className="grid gap-4">
        {statuses.map((status) => (
          <StatusEditor
            key={`${status.code}-${status.updatedAt}`}
            status={status}
            copy={copy}
            saving={saving === status.code}
            onSave={async (payload) => {
              setSaving(status.code);
              setMessage('');
              setError('');
              const response = await fetchAdminApi(`/api/admin/inquiry-statuses/${encodeURIComponent(status.code)}`, {
                method: 'PATCH',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify({...payload, expectedUpdatedAt: status.updatedAt})
              }).catch(() => null);
              setSaving('');
              if (!response?.ok) {
                setError(await responseError(response, copy.error));
                return;
              }
              const result = await response.json() as {item: CmsInquiryStatusDefinition};
              setStatuses((items) => items.map((item) => item.code === status.code ? result.item : item).sort(compareStatuses));
              setMessage(copy.saved);
            }}
          />
        ))}
      </div>
      {message ? <p className="rounded-md bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#027a48]">{message}</p> : null}
      {error ? <p className="rounded-md bg-[#fff5f5] px-4 py-3 text-sm font-semibold text-[#b42318]">{error}</p> : null}
    </div>
  );
}

function StatusEditor({
  status,
  copy,
  saving,
  onSave
}: {
  status: CmsInquiryStatusDefinition;
  copy: Copy;
  saving: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <form
      className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(formPayload(new FormData(event.currentTarget), false));
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e7ec] pb-4">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${dotClass(status.color)}`} />
          <code className="text-sm font-semibold text-[#101827]">{status.code}</code>
        </div>
        <span className="rounded-full bg-[#eef2f6] px-2.5 py-1 text-xs font-semibold text-[#475467]">
          {status.isSystem ? copy.system : copy.custom}
        </span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TextField name="labelKo" label={copy.labelKo} defaultValue={status.labelKo} required />
        <TextField name="labelEn" label={copy.labelEn} defaultValue={status.labelEn} />
        <TextField name="labelZh" label={copy.labelZh} defaultValue={status.labelZh} />
        <SelectField name="color" label={copy.color} defaultValue={status.color} colorLabels={copy.colorLabels} />
        <NumberField name="sortOrder" label={copy.sortOrder} defaultValue={status.sortOrder} />
        <label className="flex min-h-11 items-center gap-2 self-end rounded-md border border-[#d9dee7] px-3 text-sm font-semibold text-[#344054]">
          {status.isSystem ? <input name="isActive" type="hidden" value="on" /> : null}
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={status.isActive}
            disabled={status.isSystem}
            className="h-4 w-4 accent-[#7a2230]"
          />
          {copy.active}
        </label>
        <button
          disabled={saving}
          className="admin-on-dark min-h-11 self-end rounded-md bg-[#101827] px-4 text-sm font-semibold text-white disabled:opacity-50 xl:col-start-4"
        >
          {saving ? copy.saving : copy.save}
        </button>
      </div>
    </form>
  );
}

function TextField({name, label, defaultValue = '', hint, required = false, pattern}: {
  name: string;
  label: string;
  defaultValue?: string;
  hint?: string;
  required?: boolean;
  pattern?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
      <span>{label}</span>
      <input name={name} defaultValue={defaultValue} required={required} pattern={pattern} maxLength={80} className="min-h-11 rounded-md border border-[#cbd3df] px-3" />
      {hint ? <span className="text-xs font-normal leading-5 text-[#647084]">{hint}</span> : null}
    </label>
  );
}

function NumberField({name, label, defaultValue}: {name: string; label: string; defaultValue: number}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
      <span>{label}</span>
      <input name={name} type="number" min={0} max={10000} defaultValue={defaultValue} className="min-h-11 rounded-md border border-[#cbd3df] px-3" />
    </label>
  );
}

function SelectField({name, label, defaultValue, colorLabels}: {
  name: string;
  label: string;
  defaultValue: string;
  colorLabels: Copy['colorLabels'];
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue} className="min-h-11 rounded-md border border-[#cbd3df] bg-white px-3">
        {colors.map((color) => <option key={color} value={color}>{colorLabels[color]}</option>)}
      </select>
    </label>
  );
}

function formPayload(form: FormData, includeCode: boolean) {
  const payload: Record<string, unknown> = {
    labelKo: String(form.get('labelKo') || ''),
    labelEn: String(form.get('labelEn') || ''),
    labelZh: String(form.get('labelZh') || ''),
    color: String(form.get('color') || 'slate'),
    sortOrder: Number(form.get('sortOrder') || 0),
    isActive: form.get('isActive') === 'on'
  };
  if (includeCode) payload.code = String(form.get('code') || '');
  return payload;
}

function compareStatuses(a: CmsInquiryStatusDefinition, b: CmsInquiryStatusDefinition) {
  return a.sortOrder - b.sortOrder || a.code.localeCompare(b.code);
}

function dotClass(color: CmsInquiryStatusDefinition['color']) {
  return {
    slate: 'bg-[#667085]',
    blue: 'bg-[#2e90fa]',
    amber: 'bg-[#f79009]',
    green: 'bg-[#12b76a]',
    red: 'bg-[#f04438]',
    purple: 'bg-[#7f56d9]'
  }[color];
}

async function responseError(response: Response | null, fallback: string) {
  if (!response) return fallback;
  const payload = await response.json().catch(() => null) as {error?: string} | null;
  return payload?.error || fallback;
}
