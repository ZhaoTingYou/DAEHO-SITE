import Link from 'next/link';

import {listPages} from '@/lib/cms/repositories';

import {EmptyState, PageHeader, Panel} from '../../_components/admin-shell';

export default function AdminPagesPage() {
  const pages = listPages();

  return (
    <>
      <PageHeader
        title="Pages"
        description="Page groups are stored as bilingual JSON content blocks. This keeps the CMS flexible while the final frontend design is still evolving."
      />
      {pages.length === 0 ? (
        <EmptyState title="No pages" body="Run npm run cms:init to import current JSON content into the CMS database." />
      ) : (
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.12em] text-[#647084]">
                <tr>
                  <th className="px-4 py-3">Page key</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {pages.map((page) => (
                  <tr key={page.pageKey}>
                    <td className="px-4 py-4 font-semibold text-[#101827]">{page.pageKey}</td>
                    <td className="px-4 py-4 text-[#344054]">{page.section}</td>
                    <td className="px-4 py-4 font-numeric text-xs text-[#647084]">{formatDate(page.updatedAt)}</td>
                    <td className="px-4 py-4 text-right">
                      <Link href={`/admin/pages/${page.pageKey}`} className="inline-flex min-h-9 items-center rounded-md border border-[#cbd3df] px-3 text-sm font-semibold text-[#344054] hover:bg-[#f8fafc]">
                        Edit JSON
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul'
  }).format(new Date(value));
}
