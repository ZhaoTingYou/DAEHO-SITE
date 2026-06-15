import Link from 'next/link';
import {notFound} from 'next/navigation';

import {createAdminTranslator, getAdminI18n, getContentLocaleLabel} from '@/lib/admin-i18n';
import {getPage} from '@/lib/cms/repositories';
import {localeFieldSuffixes, locales, type Locale} from '@/lib/locales';

import {savePageAction} from '../../../actions';
import {SubmitButton, TextAreaField, TextField} from '../../../_components/admin-fields';
import {PageHeader, Panel} from '../../../_components/admin-shell';

type Props = {
  params: Promise<{pageKey: string}>;
};

export default async function AdminPageEditor({params}: Props) {
  const {messages, t} = await getAdminI18n();
  const {pageKey} = await params;
  const page = getPage(pageKey);

  if (!page) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={t('page.editTitle', {pageKey: page.pageKey})}
        description={t('page.editDescription')}
      />
      <form action={savePageAction} className="grid gap-6">
        <input type="hidden" name="pageKey" value={page.pageKey} />
        <Panel className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label={t('common.section')} name="section" defaultValue={page.section} required />
            <TextField label={t('common.sortOrder')} name="sortOrder" type="number" defaultValue={page.sortOrder} />
          </div>
        </Panel>
        <div className="grid gap-6 xl:grid-cols-2">
          {locales.map((locale) => (
            <PageLocalePanel key={locale} locale={locale} content={page.content[locale]} seo={page.seo[locale]} messages={messages} />
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <Link href="/admin/pages" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
            {t('common.cancel')}
          </Link>
          <SubmitButton>{t('page.saveJson')}</SubmitButton>
        </div>
      </form>
    </>
  );
}

function PageLocalePanel({
  locale,
  content,
  seo,
  messages
}: {
  locale: Locale;
  content: unknown;
  seo: unknown;
  messages: Record<string, string>;
}) {
  const suffix = localeFieldSuffixes[locale];
  const t = createAdminTranslator(messages);

  return (
    <Panel className="p-5">
      <h2 className="mb-4 border-b border-[#e4e7ec] pb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">
        {getContentLocaleLabel(messages, locale)}
      </h2>
      <div className="grid gap-4">
        <TextAreaField label={t('page.contentJson')} name={`content${suffix}`} defaultValue={formatJson(content)} rows={18} />
        <TextAreaField label={t('page.seoJson')} name={`seo${suffix}`} defaultValue={formatJson(seo)} rows={6} />
      </div>
    </Panel>
  );
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}
