import Image from 'next/image';

import {getAdminI18n} from '@/lib/admin-i18n';
import {listMedia} from '@/lib/cms/repositories';

import {
  deleteMediaAction,
  updateMediaAction,
  uploadMediaAction
} from '../../actions';
import {AdminActionAlert} from '../../_components/admin-feedback';
import {SubmitButton, TextField} from '../../_components/admin-fields';
import {EmptyState, PageHeader, Panel} from '../../_components/admin-shell';

type Props = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function AdminMediaPage({searchParams}: Props) {
  const {t} = await getAdminI18n();
  const query = await searchParams;
  const items = await listMedia();

  return (
    <>
      <PageHeader
        title={t('media.title')}
        description={t('media.description')}
      />

      <Panel className="mb-6 p-5">
        <form action={uploadMediaAction} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
          <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
            <span>{t('media.file')}</span>
            <input
              name="file"
              type="file"
              accept="image/*"
              required
              className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 py-2 text-sm"
            />
          </label>
          <TextField label={t('media.filename')} name="filename" placeholder="hero-ring.png" />
          <TextField label={t('media.altKo')} name="altKo" />
          <TextField label={t('media.altEn')} name="altEn" />
          <SubmitButton>{t('common.upload')}</SubmitButton>
        </form>
      </Panel>

      <AdminActionAlert searchParams={query} title={t('cmsAlert.title')} fallbackMessage={query?.error === 'file' ? t('media.chooseFile') : t('cmsAlert.fallback')} />

      {items.length === 0 ? (
        <EmptyState title={t('media.noItemsTitle')} body={t('media.noItemsBody')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <Panel key={item.id} className="overflow-hidden">
              <div className="relative aspect-[4/3] bg-[#eef2f6]">
                {item.url.startsWith('/') ? (
                  <Image src={item.url} alt={item.altKo || item.altEn || item.filename} fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw" className="object-cover" />
                ) : null}
              </div>
              <div className="space-y-2 p-4">
                <p className="break-all font-semibold text-[#101827]">{item.filename}</p>
                <p className="font-numeric text-xs text-[#647084]">{item.mimeType || 'unknown'} / {formatBytes(item.sizeBytes)}</p>
                <p className="font-numeric text-xs text-[#98a2b3]">{item.path}</p>
                <form action={updateMediaAction} className="grid gap-2 border-t border-[#e4e7ec] pt-3">
                  <input type="hidden" name="id" value={item.id} />
                  <label className="grid gap-1 text-xs font-semibold text-[#647084]">
                    <span>{t('media.altKo')}</span>
                    <input
                      name="altKo"
                      defaultValue={item.altKo}
                      className="min-h-9 rounded-md border border-[#cbd3df] px-2 text-sm text-[#101827]"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-[#647084]">
                    <span>{t('media.altEn')}</span>
                    <input
                      name="altEn"
                      defaultValue={item.altEn}
                      className="min-h-9 rounded-md border border-[#cbd3df] px-2 text-sm text-[#101827]"
                    />
                  </label>
                  <button className="admin-on-dark min-h-9 rounded-md bg-[#101827] px-3 text-sm font-semibold text-[#ffffff] transition hover:bg-[#7a2230]">
                    {t('common.saveAltText')}
                  </button>
                </form>
                <form action={deleteMediaAction} className="pt-1">
                  <input type="hidden" name="id" value={item.id} />
                  <button className="min-h-9 w-full rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-3 text-sm font-semibold text-[#b42318] transition hover:bg-[#fee4e2]">
                    {t('media.removeRecord')}
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
