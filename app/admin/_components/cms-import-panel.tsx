'use client';

import {useMemo, useState} from 'react';

type ImportCount = {
  table: string;
  count: number;
};

type ImportResult = {
  dryRun: boolean;
  replaced: boolean;
  schemaVersion: number;
  exportedAt: string;
  totalRows: number;
  counts: ImportCount[];
  error?: string;
};

export function CmsImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [backupText, setBackupText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'preview' | 'replace' | ''>('');

  const canPreview = Boolean(file && !busy);
  const canReplace = Boolean(result && !result.replaced && backupText && !busy);
  const fileLabel = useMemo(() => {
    if (!file) {
      return 'No file selected';
    }

    return `${file.name} / ${formatBytes(file.size)}`;
  }, [file]);

  const previewImport = async () => {
    if (!file) {
      return;
    }

    setBusy('preview');
    setError('');
    setResult(null);

    try {
      const text = await file.text();
      const nextResult = await submitImport(text, false);
      setBackupText(text);
      setResult(nextResult);
    } catch (importError) {
      setBackupText('');
      setError(importError instanceof Error ? importError.message : 'Unable to preview import.');
    } finally {
      setBusy('');
    }
  };

  const replaceImport = async () => {
    if (!backupText || !canReplace) {
      return;
    }

    const confirmed = window.confirm('Replace all CMS tables with this backup? This cannot be undone from the browser.');

    if (!confirmed) {
      return;
    }

    setBusy('replace');
    setError('');

    try {
      const nextResult = await submitImport(backupText, true);
      setResult(nextResult);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Unable to replace CMS data.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-md border border-[#e4e7ec] bg-[#f8fafc] p-4">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#647084]">Backup JSON</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              setFile(event.currentTarget.files?.[0] ?? null);
              setBackupText('');
              setResult(null);
              setError('');
            }}
            className="admin-file-control min-h-11 rounded-md border border-[#cbd3df] bg-white px-3 py-2 text-sm text-[#344054] file:mr-4 file:rounded-md file:border-0 file:bg-[#101827] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#ffffff]"
          />
        </label>
        <p className="font-mono text-xs text-[#647084]">{fileLabel}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={previewImport}
            disabled={!canPreview}
            className="admin-on-dark inline-flex min-h-10 items-center rounded-md bg-[#101827] px-4 text-sm font-semibold text-[#ffffff] transition hover:bg-[#263247] disabled:cursor-not-allowed disabled:bg-[#667085] disabled:text-[#ffffff]"
          >
            {busy === 'preview' ? 'Previewing...' : 'Preview import'}
          </button>
          <button
            type="button"
            onClick={replaceImport}
            disabled={!canReplace}
            className="admin-on-dark inline-flex min-h-10 items-center rounded-md bg-[#7a2230] px-4 text-sm font-semibold text-[#ffffff] transition hover:bg-[#101827] disabled:cursor-not-allowed disabled:bg-[#667085] disabled:text-[#ffffff]"
          >
            {busy === 'replace' ? 'Replacing...' : 'Replace CMS data'}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-[#fecdca] bg-[#fffbfa] px-4 py-3 text-sm font-semibold text-[#b42318]">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="overflow-hidden rounded-md border border-[#e4e7ec]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e7ec] bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#101827]">
                {result.replaced ? 'Import completed' : 'Import preview'}
              </p>
              <p className="mt-1 font-mono text-xs text-[#647084]">
                schema v{result.schemaVersion} / {result.exportedAt || 'unknown export time'}
              </p>
            </div>
            <span className="rounded-full bg-[#eef2f6] px-3 py-1 font-numeric text-xs font-semibold text-[#344054]">
              {result.totalRows} rows
            </span>
          </div>
          <div className="divide-y divide-[#e4e7ec] bg-white">
            {result.counts.map((item) => (
              <div key={item.table} className="flex min-h-11 items-center justify-between gap-4 px-4 py-2">
                <span className="font-mono text-xs text-[#344054]">{item.table}</span>
                <span className="font-numeric text-sm font-semibold text-[#101827]">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

async function submitImport(body: string, replace: boolean) {
  const response = await fetch(`/api/admin/import${replace ? '?replace=1' : ''}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  });
  const payload = (await response.json()) as ImportResult;

  if (!response.ok) {
    throw new Error(payload.error || 'CMS import request failed.');
  }

  return payload;
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
