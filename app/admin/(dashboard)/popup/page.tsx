import {saveSitePopupAction} from '@/app/admin/actions';
import {getAdminI18n} from '@/lib/admin-i18n';
import {listMedia} from '@/lib/cms/repositories';
import {getLocaleMessages} from '@/lib/locale-messages';
import {
  getSitePopupStatus,
  normalizeSitePopupConfig,
  sitePopupIsoToDateTimeInput
} from '@/lib/site-popup-core.mjs';

import {AdminActionAlert} from '../../_components/admin-feedback';
import {
  ImageUploadField,
  SubmitButton,
  TextField,
  type MediaLibraryItem
} from '../../_components/admin-fields';
import {PageHeader, Panel} from '../../_components/admin-shell';

type AdminPopupPageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

const statusClassNames = {
  active: 'border-[#abefc6] bg-[#ecfdf3] text-[#067647]',
  scheduled: 'border-[#b2ddff] bg-[#eff8ff] text-[#175cd3]',
  inactive: 'border-[#d0d5dd] bg-white text-[#475467]',
  expired: 'border-[#fedf89] bg-[#fffaeb] text-[#b54708]'
};

export default async function AdminPopupPage({searchParams}: AdminPopupPageProps) {
  const {t} = await getAdminI18n();
  const query = await searchParams;
  const [messages, mediaItems] = await Promise.all([
    getLocaleMessages('ko'),
    getMediaLibraryItems()
  ]);
  const config = normalizeSitePopupConfig(messages.sitePopup);
  const status = getSitePopupStatus(config);

  return (
    <>
      <PageHeader
        title={t('popup.title')}
        description={t('popup.description')}
        action={
          <span className={`inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-semibold ${statusClassNames[status]}`}>
            {t(`popup.${status}`)}
          </span>
        }
      />

      {query?.saved === '1' ? (
        <div role="status" className="mb-5 rounded-md border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#067647]">
          {t('popup.saved')}
        </div>
      ) : null}

      <AdminActionAlert
        searchParams={query}
        title={t('cmsAlert.title')}
        fallbackMessage={query?.error === 'file' ? t('page.uploadError') : t('cmsAlert.fallback')}
      />

      <form action={saveSitePopupAction} className="grid gap-6 pb-24">
        <Panel className="grid gap-5 p-5">
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-[#344054]">
            <input
              name="enabled"
              type="checkbox"
              defaultChecked={config.enabled}
              className="size-4 accent-[#7a2230]"
            />
            <span>{t('popup.enabled')}</span>
          </label>

          <ImageUploadField
            label={t('popup.image')}
            name="image"
            uploadName="imageUpload"
            defaultValue={config.image}
            uploadLabel={t('page.uploadLocalImage')}
            uploadHint={t('page.uploadLocalImageHint')}
            emptyLabel={t('common.noImage')}
            changedLabel={t('common.changed')}
            selectedLabel={t('common.imageSelected')}
            mediaItems={mediaItems}
            mediaSelectLabel={t('media.selectFromLibrary')}
            mediaLibraryTitle={t('media.libraryTitle')}
            mediaEmptyLabel={t('media.libraryEmpty')}
            mediaSelectedLabel={t('media.selectedExisting')}
            imageGuide={t('popup.imageGuide')}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label={t('popup.startsAt')}
              name="startsAt"
              type="datetime-local"
              defaultValue={sitePopupIsoToDateTimeInput(config.startsAt)}
              editorControls={false}
            />
            <TextField
              label={t('popup.endsAt')}
              name="endsAt"
              type="datetime-local"
              defaultValue={sitePopupIsoToDateTimeInput(config.endsAt)}
              editorControls={false}
            />
          </div>

          <p className="text-sm text-[#647084]">{t('popup.timezoneHint')}</p>
        </Panel>

        <div className="flex justify-end">
          <SubmitButton>{t('page.save')}</SubmitButton>
        </div>
      </form>
    </>
  );
}

async function getMediaLibraryItems(): Promise<MediaLibraryItem[]> {
  return (await listMedia()).map((item) => ({
    filename: item.filename,
    url: item.url,
    alt: item.altKo || item.altEn || item.filename
  }));
}
