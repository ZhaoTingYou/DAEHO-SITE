import Link from 'next/link';

import {getAdminI18n} from '@/lib/admin-i18n';
import {listNews} from '@/lib/cms/repositories';

import {deleteNewsAction} from '../../actions';
import {EmptyState, PageHeader, Panel} from '../../_components/admin-shell';
import {DangerButton} from '../../_components/admin-fields';

type NewsTranslation = {
  title?: string;
  categoryLabel?: string;
};

export default async function AdminNewsPage() {
  const {t} = await getAdminI18n();
  const items = listNews();

  return (
    <>
      <PageHeader
        title={t('news.title')}
        description={t('news.description')}
        action={
          <Link href="/admin/news/new" className="admin-on-dark inline-flex min-h-10 items-center rounded-md bg-[#7a2230] px-4 text-sm font-semibold text-[#ffffff] transition hover:bg-[#101827]">
            {t('news.newArticle')}
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState title={t('news.noItemsTitle')} body={t('news.noItemsBody')} />
      ) : (
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.12em] text-[#647084]">
                <tr>
                  <th className="px-4 py-3">{t('news.article')}</th>
                  <th className="px-4 py-3">{t('common.category')}</th>
                  <th className="px-4 py-3">{t('common.image')}</th>
                  <th className="px-4 py-3">{t('news.date')}</th>
                  <th className="px-4 py-3">{t('common.status')}</th>
                  <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {items.map((item) => {
                  const ko = (item.translations.ko ?? {}) as NewsTranslation;
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
                      <td className="px-4 py-4 font-numeric text-xs text-[#647084]">{item.imagePath}</td>
                      <td className="px-4 py-4 font-numeric text-xs text-[#647084]">{item.publishedAt}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={item.isVisible ? 'green' : 'gray'}>{item.isVisible ? t('common.visible') : t('common.hidden')}</Badge>
                          {item.isFeatured ? <Badge tone="red">{t('status.featured')}</Badge> : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/news/${item.id}`} className="inline-flex min-h-9 items-center rounded-md border border-[#cbd3df] px-3 text-sm font-semibold text-[#344054] hover:bg-[#f8fafc]">
                            {t('common.edit')}
                          </Link>
                          <form action={deleteNewsAction}>
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

function Badge({children, tone}: {children: React.ReactNode; tone: 'green' | 'gray' | 'red'}) {
  const className =
    tone === 'green'
      ? 'bg-[#ecfdf3] text-[#027a48]'
      : tone === 'red'
        ? 'bg-[#fff1f3] text-[#c01048]'
        : 'bg-[#eef2f6] text-[#475467]';

  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}
