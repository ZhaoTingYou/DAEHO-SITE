import Link from 'next/link';
import {notFound} from 'next/navigation';

import {getPage} from '@/lib/cms/repositories';

import {savePageAction} from '../../../actions';
import {SubmitButton, TextAreaField, TextField} from '../../../_components/admin-fields';
import {PageHeader, Panel} from '../../../_components/admin-shell';

type Props = {
  params: Promise<{pageKey: string}>;
};

export default async function AdminPageEditor({params}: Props) {
  const {pageKey} = await params;
  const page = getPage(pageKey);

  if (!page) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={`Edit ${page.pageKey}`}
        description="Validate JSON carefully before saving. If the public page has not been connected to CMS yet, this remains a prepared content source."
      />
      <form action={savePageAction} className="grid gap-6">
        <input type="hidden" name="pageKey" value={page.pageKey} />
        <Panel className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Section" name="section" defaultValue={page.section} required />
            <TextField label="Sort order" name="sortOrder" type="number" defaultValue={page.sortOrder} />
          </div>
        </Panel>
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel className="p-5">
            <h2 className="mb-4 border-b border-[#e4e7ec] pb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">Korean</h2>
            <div className="grid gap-4">
              <TextAreaField label="Content JSON" name="contentKo" defaultValue={formatJson(page.content.ko)} rows={18} />
              <TextAreaField label="SEO JSON" name="seoKo" defaultValue={formatJson(page.seo.ko)} rows={6} />
            </div>
          </Panel>
          <Panel className="p-5">
            <h2 className="mb-4 border-b border-[#e4e7ec] pb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">English</h2>
            <div className="grid gap-4">
              <TextAreaField label="Content JSON" name="contentEn" defaultValue={formatJson(page.content.en)} rows={18} />
              <TextAreaField label="SEO JSON" name="seoEn" defaultValue={formatJson(page.seo.en)} rows={6} />
            </div>
          </Panel>
        </div>
        <div className="flex justify-end gap-3">
          <Link href="/admin/pages" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
            Cancel
          </Link>
          <SubmitButton>Save page JSON</SubmitButton>
        </div>
      </form>
    </>
  );
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}
