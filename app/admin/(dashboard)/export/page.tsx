import Link from 'next/link';

import {getCmsExportCounts, getCmsExportSnapshot} from '@/lib/cms/export';

import {CmsImportPanel} from '../../_components/cms-import-panel';
import {PageHeader, Panel} from '../../_components/admin-shell';

export default function AdminExportPage() {
  const snapshot = getCmsExportSnapshot();
  const counts = getCmsExportCounts(snapshot);
  const totalRows = counts.reduce((total, item) => total + item.count, 0);

  return (
    <>
      <PageHeader
        title="Backup"
        description="Download, inspect, and restore JSON backups of CMS content, media records, inquiries, and email events."
        action={
          <Link
            href="/admin/export/download"
            prefetch={false}
            className="inline-flex min-h-10 items-center rounded-md bg-[#101827] px-4 text-sm font-semibold text-white transition hover:bg-[#263247]"
          >
            Download JSON
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#647084]">Current snapshot</p>
          <p className="mt-4 font-numeric text-4xl font-semibold text-[#101827]">{totalRows}</p>
          <p className="mt-2 text-sm leading-6 text-[#647084]">rows across {counts.length} CMS tables</p>
          <dl className="mt-6 grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-t border-[#e4e7ec] pt-4">
              <dt className="font-semibold text-[#344054]">Exported at preview</dt>
              <dd className="font-numeric text-[#647084]">{snapshot.exportedAt}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#e4e7ec] pt-4">
              <dt className="font-semibold text-[#344054]">Schema version</dt>
              <dd className="font-numeric text-[#647084]">{snapshot.schemaVersion}</dd>
            </div>
          </dl>
        </Panel>

        <Panel>
          <div className="border-b border-[#e4e7ec] px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">Included tables</h2>
          </div>
          <div className="divide-y divide-[#e4e7ec]">
            {counts.map((item) => (
              <div key={item.table} className="flex min-h-12 items-center justify-between gap-4 px-5 py-3">
                <span className="font-mono text-sm text-[#344054]">{item.table}</span>
                <span className="font-numeric text-sm font-semibold text-[#101827]">{item.count}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6 overflow-hidden">
        <div className="border-b border-[#e4e7ec] px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">Import backup</h2>
        </div>
        <div className="p-5">
          <CmsImportPanel />
        </div>
      </Panel>

      <Panel className="mt-6 overflow-hidden">
        <div className="border-b border-[#e4e7ec] px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">API examples</h2>
        </div>
        <div className="grid gap-4 p-5 text-sm leading-6 text-[#647084]">
          <p>
            The import endpoint validates a backup first. It only replaces CMS tables when
            <span className="font-mono text-[#344054]"> ?replace=1 </span>
            is present.
          </p>
          <CodeBlock>{`curl -X POST \\
  -H "x-admin-api-key: $CMS_ADMIN_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data-binary @deaho-cms-export.json \\
  http://localhost:3000/api/admin/import`}</CodeBlock>
          <CodeBlock>{`curl -X POST \\
  -H "x-admin-api-key: $CMS_ADMIN_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data-binary @deaho-cms-export.json \\
  "http://localhost:3000/api/admin/import?replace=1"`}</CodeBlock>
        </div>
      </Panel>
    </>
  );
}

function CodeBlock({children}: {children: string}) {
  return (
    <pre className="overflow-x-auto rounded-md bg-[#101827] p-4 font-mono text-xs leading-6 text-white">
      {children}
    </pre>
  );
}
