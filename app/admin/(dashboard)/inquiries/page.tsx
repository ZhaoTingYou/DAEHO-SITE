import Link from 'next/link';

import {listInquiries} from '@/lib/cms/repositories';

import {updateInquiryStatusAction} from '../../actions';
import {EmptyState, PageHeader, Panel} from '../../_components/admin-shell';

type Props = {
  searchParams?: Promise<{status?: string; source?: string}>;
};

const statuses = ['new', 'contacted', 'in_progress', 'done', 'spam'];

export default async function AdminInquiriesPage({searchParams}: Props) {
  const query = await searchParams;
  const inquiries = listInquiries({
    status: query?.status,
    source: query?.source
  });

  return (
    <>
      <PageHeader
        title="Inquiries"
        description="Contact and Golf form submissions are stored here. Email notification results are recorded separately in the database."
        action={
          <div className="flex flex-wrap gap-2">
            <FilterLink href="/admin/inquiries" label="All" active={!query?.status && !query?.source} />
            <FilterLink href="/admin/inquiries?status=new" label="New" active={query?.status === 'new'} />
            <FilterLink href="/admin/inquiries?source=contact" label="Contact" active={query?.source === 'contact'} />
            <FilterLink href="/admin/inquiries?source=golf" label="Golf" active={query?.source === 'golf'} />
          </div>
        }
      />

      {inquiries.length === 0 ? (
        <EmptyState title="No inquiries" body="New Contact and Golf form submissions will appear here as soon as users submit them." />
      ) : (
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.12em] text-[#647084]">
                <tr>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {inquiries.map((item) => (
                  <tr key={item.id} id={item.id} className="align-top">
                    <td className="px-4 py-4 font-numeric text-xs text-[#647084]">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[#eef2f6] px-2 py-1 text-xs font-semibold text-[#475467]">
                        {item.source}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/admin/inquiries/${item.id}`} className="font-semibold text-[#101827] hover:text-[#7a2230]">
                        {item.name}
                      </Link>
                      <p className="mt-1 text-xs text-[#647084]">{item.locale.toUpperCase()}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#101827]">{item.contact}</p>
                      {item.organization ? <p className="mt-1 text-xs text-[#647084]">{item.organization}</p> : null}
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-[360px] space-y-1 text-[#344054]">
                        {item.inquiryType ? <p>Type: {item.inquiryType}</p> : null}
                        {item.team ? <p>Team: {item.team}</p> : null}
                        {item.quantity ? <p>Qty: {item.quantity}</p> : null}
                        {item.dueDate ? <p>Due: {item.dueDate}</p> : null}
                        {item.useCase ? <p>Use: {item.useCase}</p> : null}
                        {item.message ? <p className="line-clamp-3 text-[#647084]">{item.message}</p> : null}
                        {item.pagePath ? <p className="font-numeric text-xs text-[#98a2b3]">{item.pagePath}</p> : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <form action={updateInquiryStatusAction} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={item.id} />
                        <select
                          name="status"
                          defaultValue={item.status}
                          className="min-h-9 rounded-md border border-[#cbd3df] bg-white px-2 text-sm font-semibold text-[#344054]"
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <button className="admin-on-dark min-h-9 rounded-md bg-[#101827] px-3 text-sm font-semibold text-[#ffffff]">
                          Update
                        </button>
                        <Link href={`/admin/inquiries/${item.id}`} className="inline-flex min-h-9 items-center rounded-md border border-[#cbd3df] px-3 text-sm font-semibold text-[#344054] hover:bg-[#f8fafc]">
                          Open
                        </Link>
                      </form>
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

function FilterLink({href, label, active}: {href: string; label: string; active: boolean}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-semibold ${
        active
          ? 'admin-on-dark border-[#101827] bg-[#101827] text-[#ffffff]'
          : 'border-[#cbd3df] bg-white text-[#344054] hover:bg-[#f8fafc]'
      }`}
    >
      {label}
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul'
  }).format(new Date(value));
}
