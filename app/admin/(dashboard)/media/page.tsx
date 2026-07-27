import {getAdminI18n} from '@/lib/admin-i18n';
import {listMedia} from '@/lib/cms/repositories';
import {imageSrc} from '@/lib/image-src';

import {
  deleteMediaAction,
  updateMediaAction,
  uploadMediaAction
} from '../../actions';
import {AdminActionAlert} from '../../_components/admin-feedback';
import {
  ContentLocalePanel,
  ContentLocaleProvider,
  ContentLocaleSwitcher
} from '../../_components/content-locale-editor';
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

      <ContentLocaleProvider>
        <div className="mb-6">
          <ContentLocaleSwitcher
            label={t('contentLocale.editorLabel')}
            labels={{
              ko: t('contentLocale.ko'),
              en: t('contentLocale.en')
            }}
          />
        </div>

        <Panel className="mb-6 p-5">
          <form action={uploadMediaAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
          <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-[#344054]">
            <span>{t('media.file')}</span>
            <input
              name="file"
              type="file"
              accept="image/*"
              required
              className="min-h-10 w-full min-w-0 rounded-md border border-[#cbd3df] bg-white px-3 py-2 text-sm"
            />
          </label>
          <MediaUploadTextField label={t('media.filename')} name="filename" placeholder="hero-ring.png" />
          <ContentLocalePanel locale="ko">
            <MediaUploadTextField label={t('media.altKo')} name="altKo" />
          </ContentLocalePanel>
          <ContentLocalePanel locale="en">
            <MediaUploadTextField label={t('media.altEn')} name="altEn" />
          </ContentLocalePanel>
          <div className="md:col-span-2 xl:col-span-1">
            <button className="admin-on-dark min-h-10 w-full whitespace-nowrap rounded-md bg-[#7a2230] px-4 text-sm font-semibold text-[#ffffff] transition hover:bg-[#101827] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230]">
              {t('common.upload')}
            </button>
          </div>
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
                {item.url ? (
                  <span
                    aria-label={item.altKo || item.altEn || item.filename}
                    role="img"
                    className="block h-full w-full bg-cover bg-center"
                    style={{backgroundImage: `url("${cssUrl(mediaPreviewUrl(item))}")`}}
                  />
                ) : null}
              </div>
              <div className="space-y-2 p-4">
                <p className="break-all font-semibold text-[#101827]">{item.filename}</p>
                <p className="font-numeric text-xs text-[#647084]">{item.mimeType || 'unknown'} / {formatBytes(item.sizeBytes)}</p>
                <p className="font-numeric text-xs text-[#98a2b3]">{item.path}</p>
                <form action={updateMediaAction} className="grid gap-2 border-t border-[#e4e7ec] pt-3">
                  <input type="hidden" name="id" value={item.id} />
                  <ContentLocalePanel locale="ko">
                    <label className="grid gap-1 text-xs font-semibold text-[#647084]">
                      <span>{t('media.altKo')}</span>
                      <input
                        name="altKo"
                        defaultValue={item.altKo}
                        className="min-h-9 w-full rounded-md border border-[#cbd3df] px-2 text-sm text-[#101827]"
                      />
                    </label>
                  </ContentLocalePanel>
                  <ContentLocalePanel locale="en">
                    <label className="grid gap-1 text-xs font-semibold text-[#647084]">
                      <span>{t('media.altEn')}</span>
                      <input
                        name="altEn"
                        defaultValue={item.altEn}
                        className="min-h-9 w-full rounded-md border border-[#cbd3df] px-2 text-sm text-[#101827]"
                      />
                    </label>
                  </ContentLocalePanel>
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
      </ContentLocaleProvider>
    </>
  );
}

function MediaUploadTextField({
  label,
  name,
  placeholder
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-[#344054]">
      <span>{label}</span>
      <input
        name={name}
        placeholder={placeholder}
        className="min-h-10 w-full min-w-0 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
      />
    </label>
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

function cssUrl(value: string) {
  return value.replace(/["\\\n\r\f]/g, '\\$&');
}

function mediaPreviewUrl(item: {filename: string; url: string}) {
  const itemUrl = item.url.trim();
  return /^https?:\/\//i.test(itemUrl) ? itemUrl : imageSrc(item.filename);
}
