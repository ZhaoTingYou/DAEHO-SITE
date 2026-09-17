import {saveSitePopupAction} from '@/app/admin/actions';
import {getAdminI18n} from '@/lib/admin-i18n';
import {assertAdminCapability} from '@/lib/cms/admin-session';
import {listMedia} from '@/lib/cms/repositories';
import {getLocaleMessages} from '@/lib/locale-messages';
import {
  getSitePopupStatus,
  normalizeSitePopupConfig
} from '@/lib/site-popup-core.mjs';

import {AdminActionAlert} from '../../_components/admin-feedback';
import {SubmitButton, type MediaLibraryItem} from '../../_components/admin-fields';
import {PageHeader} from '../../_components/admin-shell';
import {SitePopupEditor} from '../../_components/site-popup-editor';

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
  await assertAdminCapability('content:read');
  const {t} = await getAdminI18n();
  const query = await searchParams;
  const [messages, mediaItems] = await Promise.all([
    getLocaleMessages('ko'),
    getMediaLibraryItems()
  ]);
  const config = normalizeSitePopupConfig(messages.sitePopup);
  const statusCounts = config.items.reduce<Record<string, number>>((counts, item) => {
    const status = getSitePopupStatus(item);
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
  const primaryStatus: keyof typeof statusClassNames = statusCounts.active
    ? 'active'
    : statusCounts.scheduled
      ? 'scheduled'
      : 'inactive';

  return (
    <>
      <PageHeader
        title={t('popup.title')}
        description={t('popup.description')}
        action={
          <span className={`inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-semibold ${statusClassNames[primaryStatus]}`}>
            {t(`popup.${primaryStatus}`)} · {config.items.length}
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
        <SitePopupEditor
          initialItems={config.items}
          mediaItems={mediaItems}
          text={{
            add: t('popup.add'),
            empty: t('popup.empty'),
            enabled: t('popup.enabled'),
            endsAt: t('popup.endsAt'),
            image: t('popup.image'),
            imageGuide: t('popup.imageGuide'),
            item: t('popup.item'),
            remove: t('common.delete'),
            startsAt: t('popup.startsAt'),
            timezoneHint: t('popup.timezoneHint'),
            uploadLabel: t('page.uploadLocalImage'),
            uploadHint: t('page.uploadLocalImageHint'),
            noImage: t('common.noImage'),
            changed: t('common.changed'),
            imageSelected: t('common.imageSelected'),
            mediaSelect: t('media.selectFromLibrary'),
            mediaTitle: t('media.libraryTitle'),
            mediaEmpty: t('media.libraryEmpty'),
            mediaSelected: t('media.selectedExisting')
          }}
        />

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
