import Link from 'next/link';

import {getAdminI18n} from '@/lib/admin-i18n';
import {listCollections} from '@/lib/cms/repositories';

import {deleteCollectionAction} from '../../actions';
import {DangerButton} from '../../_components/admin-fields';
import {EmptyState, PageHeader, Panel} from '../../_components/admin-shell';

type CollectionTranslation = {
  title?: string;
  categoryLabel?: string;
  sportCategoryLabel?: string;
};

export default async function AdminCollectionsPage() {
  const {t} = await getAdminI18n();
  const items = await listCollections();

  return (
    <>
      <PageHeader
        title={t('collection.title')}
        description={t('collection.description')}
        action={
          <Link href="/admin/collections/new" className="admin-on-dark inline-flex min-h-10 items-center rounded-md bg-[#7a2230] px-4 text-sm font-semibold text-[#ffffff] transition hover:bg-[#101827]">
            {t('collection.newItem')}
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState title={t('collection.noItemsTitle')} body={t('collection.noItemsBody')} />
      ) : (
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.12em] text-[#647084]">
                <tr>
                  <th className="px-4 py-3">{t('collection.item')}</th>
                  <th className="px-4 py-3">{t('common.category')}</th>
                  <th className="px-4 py-3">{t('collection.sport')}</th>
                  <th className="px-4 py-3">{t('common.image')}</th>
                  <th className="px-4 py-3">{t('common.status')}</th>
                  <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {items.map((item) => {
                  const ko = (item.translations.ko ?? {}) as CollectionTranslation;
                  return (
                    <tr key={item.id} className="align-middle">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#101827]">{ko.title || item.slug}</p>
                        <p className="mt-1 font-numeric text-xs text-[#647084]">{item.slug}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#344054]">{item.category}</p>
                        <p className="mt-1 text-xs text-[#647084]">{ko.categoryLabel}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#344054]">{item.sportCategory || '-'}</p>
                        <p className="mt-1 text-xs text-[#647084]">{ko.sportCategoryLabel}</p>
                      </td>
                      <td className="px-4 py-4 font-numeric text-xs text-[#647084]">{item.imagePath}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.isVisible ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#eef2f6] text-[#475467]'}`}>
                          {item.isVisible ? t('common.visible') : t('common.hidden')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/collections/${item.id}`} className="inline-flex min-h-9 items-center rounded-md border border-[#cbd3df] px-3 text-sm font-semibold text-[#344054] hover:bg-[#f8fafc]">
                            {t('common.edit')}
                          </Link>
                          <form action={deleteCollectionAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <DangerButton>{t('common.delete')}</DangerButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}
