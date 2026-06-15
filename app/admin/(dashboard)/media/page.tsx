import Image from 'next/image';

import {listMedia} from '@/lib/cms/repositories';

import {
  deleteMediaAction,
  updateMediaAction,
  uploadMediaAction
} from '../../actions';
import {SubmitButton, TextField} from '../../_components/admin-fields';
import {EmptyState, PageHeader, Panel} from '../../_components/admin-shell';

type Props = {
  searchParams?: Promise<{error?: string}>;
};

export default async function AdminMediaPage({searchParams}: Props) {
  const query = await searchParams;
  const items = listMedia();

  return (
    <>
      <PageHeader
        title="Media"
        description="Current uploads are written to public/images and registered in cms_media. The storage provider fields are ready for object storage later."
      />

      <Panel className="mb-6 p-5">
        <form action={uploadMediaAction} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
            <span>File</span>
            <input
              name="file"
              type="file"
              accept="image/*"
              required
              className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 py-2 text-sm"
            />
          </label>
          <TextField label="Alt Korean" name="altKo" />
          <TextField label="Alt English" name="altEn" />
          <SubmitButton>Upload</SubmitButton>
        </form>
        {query?.error === 'file' ? <p className="mt-3 text-sm font-semibold text-[#b42318]">Please choose a file.</p> : null}
      </Panel>

      {items.length === 0 ? (
        <EmptyState title="No media" body="Uploaded image records and imported public/images assets will appear here." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <Panel key={item.id} className="overflow-hidden">
              <div className="relative aspect-[4/3] bg-[#eef2f6]">
                {item.url.startsWith('/images/') ? (
                  <Image src={item.url} alt={item.altKo || item.filename} fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw" className="object-cover" />
                ) : null}
              </div>
              <div className="space-y-2 p-4">
                <p className="break-all font-semibold text-[#101827]">{item.filename}</p>
                <p className="font-numeric text-xs text-[#647084]">{item.mimeType || 'unknown'} / {formatBytes(item.sizeBytes)}</p>
                <p className="font-numeric text-xs text-[#98a2b3]">{item.path}</p>
                <form action={updateMediaAction} className="grid gap-2 border-t border-[#e4e7ec] pt-3">
                  <input type="hidden" name="id" value={item.id} />
                  <label className="grid gap-1 text-xs font-semibold text-[#647084]">
                    <span>Alt Korean</span>
                    <input
                      name="altKo"
                      defaultValue={item.altKo}
                      className="min-h-9 rounded-md border border-[#cbd3df] px-2 text-sm text-[#101827]"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-[#647084]">
                    <span>Alt English</span>
                    <input
                      name="altEn"
                      defaultValue={item.altEn}
                      className="min-h-9 rounded-md border border-[#cbd3df] px-2 text-sm text-[#101827]"
                    />
                  </label>
                  <button className="admin-on-dark min-h-9 rounded-md bg-[#101827] px-3 text-sm font-semibold text-[#ffffff] transition hover:bg-[#7a2230]">
                    Save alt text
                  </button>
                </form>
                <form action={deleteMediaAction} className="pt-1">
                  <input type="hidden" name="id" value={item.id} />
                  <button className="min-h-9 w-full rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-3 text-sm font-semibold text-[#b42318] transition hover:bg-[#fee4e2]">
                    Remove record
                  </button>
                </form>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
