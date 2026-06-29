import Link from 'next/link';
import {notFound} from 'next/navigation';

import {createAdminTranslator, getAdminI18n, getContentLocaleLabel} from '@/lib/admin-i18n';
import type {AdminLocale} from '@/lib/admin-locales';
import {
  cloneJson,
  getPageContentGroupOverride,
  getPageContentGroups,
  deepMergeJson,
  getEditableLeafCount,
  getEditableLeafCountForPageGroup,
  getPageFieldDefinitionsForGroup,
  getManagedPageDefinition,
  getObjectValueAtPath,
  isImageEditableField,
  type PageArrayItemFieldDefinition,
  type PageDefinition,
  type PageFieldDefinition
} from '@/lib/cms/page-catalog';
import {
  getLocalizedArrayItemFields,
  getLocalizedContentGroupTitle,
  getLocalizedPageDescription,
  getLocalizedPageFieldLabel,
  getLocalizedPageTitle,
  getLocalizedPathLabel
} from '@/lib/cms/page-catalog-i18n';
import {getPage, listMedia} from '@/lib/cms/repositories';
import {getLocaleMessages} from '@/lib/locale-messages';
import {localeFieldSuffixes, locales, type Locale} from '@/lib/locales';

import {savePageAction} from '../../../actions';
import {AdminActionAlert} from '../../../_components/admin-feedback';
import {AppendableArrayItemsField, ImageUploadField, SubmitButton, TextAreaField, TextField, type MediaLibraryItem} from '../../../_components/admin-fields';
import {PageHeader, Panel} from '../../../_components/admin-shell';

type Props = {
  params: Promise<{pageKey: string}>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

type PageLocaleData = {
  locale: Locale;
  groups: PageLocaleContentGroup[];
  seo: Record<string, unknown>;
};

type PageLocaleContentGroup = {
  key: string;
  title: string;
  sourcePath: string;
  content: Record<string, unknown>;
};

type RenderContext = {
  adminLocale: AdminLocale;
  locale: Locale;
  groupKey: string;
  mediaItems: MediaLibraryItem[];
  messages: Record<string, string>;
};

const hiddenKeys = new Set(['id']);

export default async function AdminPageEditor({params, searchParams}: Props) {
  const {locale: adminLocale, messages, t} = await getAdminI18n();
  const {pageKey} = await params;
  const query = await searchParams;
  const definition = getManagedPageDefinition(pageKey);
  const row = await getPage(pageKey);
  const mediaItems = await getMediaLibraryItems();
  const localeMessages = Object.fromEntries(
    await Promise.all(locales.map(async (locale) => [locale, await getLocaleMessages(locale)] as const))
  ) as Record<Locale, Awaited<ReturnType<typeof getLocaleMessages>>>;

  if (!definition && !row) {
    notFound();
  }

  const page = {
    pageKey,
    section: row?.section ?? definition?.section ?? 'site',
    sortOrder: row?.sortOrder ?? definition?.sortOrder ?? 0
  };
  const localeData = locales.map((locale) => getPageLocaleData(locale, definition, row, localeMessages[locale], adminLocale));
  const title = definition ? getLocalizedPageTitle(definition, adminLocale) : page.pageKey;

  return (
    <>
      <PageHeader
        title={t('page.editTitle', {pageKey: title})}
        description={definition ? getLocalizedPageDescription(definition, adminLocale) : t('page.editDescription')}
        action={
          definition ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/ko${definition.href === '/' ? '' : definition.href}`} className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
                {t('page.previewKo')}
              </Link>
              <Link href={`/en${definition.href === '/' ? '' : definition.href}`} className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
                {t('page.previewEn')}
              </Link>
            </div>
          ) : null
        }
      />

      <AdminActionAlert searchParams={query} title={t('cmsAlert.title')} fallbackMessage={query?.error === 'file' ? t('page.uploadError') : t('cmsAlert.fallback')} />

      <form action={savePageAction} className="grid gap-6 pb-24">
        <input type="hidden" name="pageKey" value={page.pageKey} />

        <Panel className="p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ReadOnlyMeta label={t('page.key')} value={page.pageKey} />
            <ReadOnlyMeta label={t('page.route')} value={definition?.href ?? t('common.none')} />
            <TextField label={t('common.section')} name="section" defaultValue={page.section} required />
            <TextField label={t('common.sortOrder')} name="sortOrder" type="number" defaultValue={page.sortOrder} />
          </div>
          {definition ? (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#475467]">
              <span className="rounded bg-[#f8fafc] px-2 py-1 ring-1 ring-[#e4e7ec]">{t('page.groupCount', {count: getPageContentGroups(definition).length})}</span>
              <span className="rounded bg-[#f8fafc] px-2 py-1 ring-1 ring-[#e4e7ec]">{t('page.fieldCount', {count: countLocaleFields(localeData[0], definition)})}</span>
              <span className="rounded bg-[#f8fafc] px-2 py-1 ring-1 ring-[#e4e7ec]">
                {row ? t('page.initialized') : t('page.pendingInit')}
              </span>
            </div>
          ) : null}
        </Panel>

        <div className="grid gap-6 xl:grid-cols-2">
          {localeData.map((data) => (
            <PageLocalePanel
              key={data.locale}
              locale={data.locale}
              groups={data.groups}
              seo={data.seo}
              definition={definition}
              adminLocale={adminLocale}
              mediaItems={mediaItems}
              messages={messages}
            />
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/admin/pages" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
            {t('common.cancel')}
          </Link>
          <SubmitButton>{t('page.save')}</SubmitButton>
        </div>

        <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-[80] flex items-center gap-2 rounded-xl border border-[#d9dee7] bg-white/95 p-2 shadow-[0_18px_45px_rgba(16,24,39,.16)] backdrop-blur md:right-8">
          <Link href="/admin/pages" className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]">
            {t('common.cancel')}
          </Link>
          <SubmitButton>{t('page.save')}</SubmitButton>
        </div>
      </form>
    </>
  );
}

function PageLocalePanel({
  locale,
  groups,
  seo,
  definition,
  adminLocale,
  mediaItems,
  messages
}: {
  locale: Locale;
  groups: PageLocaleContentGroup[];
  seo: Record<string, unknown>;
  definition: PageDefinition | null;
  adminLocale: AdminLocale;
  mediaItems: MediaLibraryItem[];
  messages: Record<string, string>;
}) {
  const suffix = localeFieldSuffixes[locale];
  const t = createAdminTranslator(messages);

  return (
    <Panel className="p-5">
      <textarea hidden readOnly name={`seo${suffix}`} value={formatJson(seo)} />
      {groups.map((group) => (
        <textarea key={group.key} hidden readOnly name={`content${suffix}.${group.key}`} value={formatJson(group.content)} />
      ))}

      <h2 className="mb-4 border-b border-[#e4e7ec] pb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">
        {getContentLocaleLabel(messages, locale)}
      </h2>

      <div className="grid gap-5">
        {groups.map((group) => {
          const context = {adminLocale, locale, groupKey: group.key, mediaItems, messages};
          const fields = definition ? getPageFieldDefinitionsForGroup(definition, group.key, group.content) : null;

          return (
            <ContentGroupEditor key={group.key} group={group} context={context} fields={fields} definition={definition} />
          );
        })}

        <section className="grid gap-4 rounded-md border border-[#e4e7ec] bg-[#f8fafc] p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{t('page.seoSection')}</h3>
          <TextField label={t('form.seoTitle')} name={`seoField.${locale}.title`} defaultValue={stringValue(seo.title)} />
          <TextAreaField label={t('form.seoDescription')} name={`seoField.${locale}.description`} defaultValue={stringValue(seo.description)} rows={3} />
          <ImageUploadField
            label={t('form.ogImage')}
            name={`seoField.${locale}.ogImagePath`}
            uploadName={`seoImage.${locale}.ogImagePath`}
            defaultValue={stringValue(seo.ogImagePath)}
            uploadLabel={t('page.uploadLocalImage')}
            uploadHint={t('page.uploadLocalImageHint')}
            emptyLabel={t('common.noImage')}
            changedLabel={t('common.changed')}
            selectedLabel={t('common.imageSelected')}
            syncedLabel={t('common.imageSynced')}
            mediaItems={mediaItems}
            mediaSelectLabel={t('media.selectFromLibrary')}
            mediaLibraryTitle={t('media.libraryTitle')}
            mediaEmptyLabel={t('media.libraryEmpty')}
            mediaSelectedLabel={t('media.selectedExisting')}
            syncKey="page-seo:ogImagePath"
          />
        </section>
      </div>
    </Panel>
  );
}

function ContentGroupEditor({
  group,
  context,
  fields,
  definition
}: {
  group: PageLocaleContentGroup;
  context: RenderContext;
  fields: PageFieldDefinition[] | null;
  definition: PageDefinition | null;
}) {
  const entries = Object.entries(group.content);

  if ((fields && fields.length === 0) || (!fields && entries.length === 0)) {
    return null;
  }

  const fieldCount = definition
    ? getEditableLeafCountForPageGroup(definition, group.key, group.content)
    : getEditableLeafCount(group.content);

  return (
    <section className="grid gap-4 rounded-md border border-[#d9dee7] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eef2f6] pb-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{group.title}</h3>
        </div>
        <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1 text-xs font-semibold text-[#647084]">
          {fieldCount}
        </span>
      </div>
      <div className="grid gap-4">
        {fields
          ? fields.map((field) => (
              <EditableNode
                key={field.path}
                path={field.path}
                label={getLocalizedPageFieldLabel(field, context.adminLocale)}
                value={getObjectValueAtPath(group.content, field.path)}
                context={context}
                depth={0}
                forceImage={field.type === 'image'}
                itemFields={getLocalizedArrayItemFields(field.itemFields, context.adminLocale)}
                rows={field.rows}
              />
            ))
          : entries.map(([key, value]) => (
              <EditableNode key={key} path={key} label={getLocalizedPathLabel(key, context.adminLocale)} value={value} context={context} depth={0} />
            ))}
      </div>
    </section>
  );
}

function EditableNode({
  path,
  label,
  value,
  context,
  depth,
  forceImage = false,
  itemFields,
  rows
}: {
  path: string;
  label: string;
  value: unknown;
  context: RenderContext;
  depth: number;
  forceImage?: boolean;
  itemFields?: PageArrayItemFieldDefinition[];
  rows?: number;
}) {
  if (hiddenKeys.has(lastPathSegment(path))) {
    return <input type="hidden" name={contentFieldName(context.locale, context.groupKey, path)} value={stringValue(value)} />;
  }

  if (Array.isArray(value)) {
    return <EditableArray path={path} label={label} value={value} context={context} depth={depth} itemFields={itemFields} />;
  }

  if (value && typeof value === 'object') {
    return <EditableGroup path={path} label={label} value={value as Record<string, unknown>} context={context} depth={depth} />;
  }

  return <EditableLeaf path={path} label={label} value={value} context={context} forceImage={forceImage} rows={rows} />;
}

function EditableGroup({
  path,
  label,
  value,
  context,
  depth
}: {
  path: string;
  label: string;
  value: Record<string, unknown>;
  context: RenderContext;
  depth: number;
  itemFields?: PageArrayItemFieldDefinition[];
}) {
  const entries = Object.entries(value);

  if (entries.length === 0) {
    return null;
  }

  if (depth > 0) {
    return (
      <details open={depth < 2} className="rounded-md border border-[#e4e7ec] bg-[#fbfcfe]">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">
          {label}
        </summary>
        <div className="grid gap-4 border-t border-[#e4e7ec] p-4">
          {entries.map(([key, item]) => (
            <EditableNode
              key={`${path}.${key}`}
              path={`${path}.${key}`}
              label={labelForPath(`${path}.${key}`, item, context.adminLocale)}
              value={item}
              context={context}
              depth={depth + 1}
            />
          ))}
        </div>
      </details>
    );
  }

  return (
    <section className="grid gap-4 rounded-md border border-[#e4e7ec] bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{label}</h3>
      <div className="grid gap-4">
        {entries.map(([key, item]) => (
          <EditableNode
            key={`${path}.${key}`}
            path={`${path}.${key}`}
            label={labelForPath(`${path}.${key}`, item, context.adminLocale)}
            value={item}
            context={context}
            depth={depth + 1}
          />
        ))}
      </div>
    </section>
  );
}

function EditableArray({
  path,
  label,
  value,
  context,
  depth,
  itemFields
}: {
  path: string;
  label: string;
  value: unknown[];
  context: RenderContext;
  depth: number;
  itemFields?: PageArrayItemFieldDefinition[];
}) {
  if (value.length === 0) {
    return (
      <section className="grid gap-4 rounded-md border border-[#e4e7ec] bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{label}</h3>
        <p className="mt-2 text-sm text-[#98a2b3]">{createAdminTranslator(context.messages)('page.emptySection')}</p>
        {itemFields?.length ? (
          <AppendArrayItems path={path} startIndex={0} context={context} itemFields={itemFields} />
        ) : null}
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-md border border-[#e4e7ec] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{label}</h3>
        <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1 text-xs font-semibold text-[#647084]">
          {value.length}
        </span>
      </div>
      <div className="grid gap-3">
        {value.map((item, index) => (
          <div key={`${path}.${index}`} className="grid gap-4 rounded-md border border-[#eef2f6] bg-[#fbfcfe] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#98a2b3]">
              {itemTitle(item, index, context.adminLocale)}
            </p>
            {itemFields?.length ? (
              <EditableArrayItemFields
                path={`${path}.${index}`}
                value={item}
                context={context}
                itemFields={itemFields}
              />
            ) : (
              <EditableNode
                path={`${path}.${index}`}
                label={labelForPath(`${path}.${index}`, item, context.adminLocale)}
                value={item}
                context={context}
                depth={depth + 1}
              />
            )}
          </div>
        ))}
      </div>
      {itemFields?.length ? (
        <AppendArrayItems path={path} startIndex={value.length} context={context} itemFields={itemFields} />
      ) : null}
    </section>
  );
}

function EditableArrayItemFields({
  path,
  value,
  context,
  itemFields
}: {
  path: string;
  value: unknown;
  context: RenderContext;
  itemFields: PageArrayItemFieldDefinition[];
}) {
  const item = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const t = createAdminTranslator(context.messages);

  return (
    <div className="grid gap-4">
      {itemFields.map((field) => {
        const fieldPath = `${path}.${field.path}`;
        const fieldValue = arrayItemFieldValue(item, field);
        const name = contentFieldName(context.locale, context.groupKey, fieldPath);

        if (field.type === 'image') {
          return (
            <ImageUploadField
              key={field.path}
              label={field.label}
              name={name}
              uploadName={contentImageFieldName(context.locale, context.groupKey, fieldPath)}
              defaultValue={stringValue(fieldValue)}
              placeholder={field.placeholder ?? 'image-name.png'}
              uploadLabel={t('page.uploadLocalImage')}
              uploadHint={t('page.uploadLocalImageHint')}
              emptyLabel={t('common.noImage')}
              changedLabel={t('common.changed')}
              selectedLabel={t('common.imageSelected')}
              syncedLabel={t('common.imageSynced')}
              mediaItems={context.mediaItems}
              mediaSelectLabel={t('media.selectFromLibrary')}
              mediaLibraryTitle={t('media.libraryTitle')}
              mediaEmptyLabel={t('media.libraryEmpty')}
              mediaSelectedLabel={t('media.selectedExisting')}
              syncKey={`page-content:${context.groupKey}:${fieldPath}`}
            />
          );
        }

        if (field.type === 'textarea') {
          return (
            <TextAreaField
              key={field.path}
              label={field.label}
              name={name}
              defaultValue={stringValue(fieldValue)}
              rows={field.rows ?? textareaRows(stringValue(fieldValue))}
            />
          );
        }

        if (typeof fieldValue === 'number') {
          return <TextField key={field.path} label={field.label} name={name} type="number" defaultValue={fieldValue} />;
        }

        return (
          <TextField
            key={field.path}
            label={field.label}
            name={name}
            defaultValue={stringValue(fieldValue)}
            placeholder={field.placeholder}
          />
        );
      })}
    </div>
  );
}

function AppendArrayItems({
  path,
  startIndex,
  context,
  itemFields
}: {
  path: string;
  startIndex: number;
  context: RenderContext;
  itemFields: PageArrayItemFieldDefinition[];
}) {
  const t = createAdminTranslator(context.messages);

  return (
    <AppendableArrayItemsField
      path={path}
      startIndex={startIndex}
      locale={context.locale}
      groupKey={context.groupKey}
      itemFields={itemFields}
      mediaItems={context.mediaItems}
      title={appendItemTitle(context.adminLocale)}
      hint={appendItemHint(context.adminLocale)}
      addButtonLabel={appendItemButtonLabel(context.adminLocale)}
      removeButtonLabel={removeItemButtonLabel(context.adminLocale)}
      uploadLabel={t('page.uploadLocalImage')}
      uploadHint={t('page.uploadLocalImageHint')}
      emptyLabel={t('common.noImage')}
      changedLabel={t('common.changed')}
      selectedLabel={t('common.imageSelected')}
      syncedLabel={t('common.imageSynced')}
      mediaSelectLabel={t('media.selectFromLibrary')}
      mediaLibraryTitle={t('media.libraryTitle')}
      mediaEmptyLabel={t('media.libraryEmpty')}
      mediaSelectedLabel={t('media.selectedExisting')}
    />
  );
}

function EditableLeaf({
  path,
  label,
  value,
  context,
  forceImage = false,
  rows
}: {
  path: string;
  label: string;
  value: unknown;
  context: RenderContext;
  forceImage?: boolean;
  rows?: number;
}) {
  const name = contentFieldName(context.locale, context.groupKey, path);
  const t = createAdminTranslator(context.messages);

  if (forceImage || isImageEditableField(path, value)) {
    return (
      <ImageUploadField
        label={label}
        name={name}
        uploadName={contentImageFieldName(context.locale, context.groupKey, path)}
        defaultValue={stringValue(value)}
        placeholder="image-name.png"
        uploadLabel={t('page.uploadLocalImage')}
        uploadHint={t('page.uploadLocalImageHint')}
        emptyLabel={t('common.noImage')}
        changedLabel={t('common.changed')}
        selectedLabel={t('common.imageSelected')}
        syncedLabel={t('common.imageSynced')}
        mediaItems={context.mediaItems}
        mediaSelectLabel={t('media.selectFromLibrary')}
        mediaLibraryTitle={t('media.libraryTitle')}
        mediaEmptyLabel={t('media.libraryEmpty')}
        mediaSelectedLabel={t('media.selectedExisting')}
        syncKey={`page-content:${context.groupKey}:${path}`}
      />
    );
  }

  if (typeof value === 'number') {
    return <TextField label={label} name={name} type="number" defaultValue={value} />;
  }

  if (typeof value === 'boolean') {
    return (
      <label className="flex min-h-10 items-center gap-2 rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#344054]">
        <input
          name={name}
          type="checkbox"
          defaultChecked={value}
          className="h-4 w-4 rounded border-[#cbd3df] accent-[#7a2230]"
        />
        <span>{label}</span>
      </label>
    );
  }

  const text = stringValue(value);

  if (rows || shouldUseTextarea(path, text)) {
    return <TextAreaField label={label} name={name} defaultValue={text} rows={rows ?? textareaRows(text)} />;
  }

  return <TextField label={label} name={name} defaultValue={text} />;
}

function ReadOnlyMeta({label, value}: {label: string; value: string}) {
  return (
    <div className="grid gap-1.5 text-sm font-semibold text-[#344054]">
      <span>{label}</span>
      <span className="min-h-10 rounded-md border border-[#d9dee7] bg-[#f8fafc] px-3 py-2 text-sm font-semibold text-[#101827]">
        {value}
      </span>
    </div>
  );
}

function getPageLocaleData(
  locale: Locale,
  definition: PageDefinition | null,
  row: Awaited<ReturnType<typeof getPage>>,
  messages: Awaited<ReturnType<typeof getLocaleMessages>>,
  adminLocale: AdminLocale
): PageLocaleData {
  const rowContent = row?.content[locale] ?? {};
  const groups = definition
    ? getPageContentGroups(definition).map((group) => {
        const fallbackContent = readStaticContent(messages, group.sourcePath);
        const overrideContent = getPageContentGroupOverride(rowContent, group.key);

        return {
          ...group,
          title: getLocalizedContentGroupTitle(definition, group, adminLocale),
          content: deepMergeJson(fallbackContent, overrideContent)
        };
      })
    : [
        {
          key: 'main',
          title: row?.pageKey ?? '',
          sourcePath: row?.pageKey ?? '',
          content: cloneJson((rowContent && typeof rowContent === 'object' ? rowContent : {}) as Record<string, unknown>)
        }
      ];

  return {
    locale,
    groups,
    seo: getSeoFallback(messages, definition, row?.seo[locale])
  };
}

function readStaticContent(messages: Awaited<ReturnType<typeof getLocaleMessages>>, sourcePath: string) {
  const content = getObjectValueAtPath(messages, sourcePath);

  return cloneJson((content && typeof content === 'object' ? content : {}) as Record<string, unknown>);
}

function getSeoFallback(messages: Awaited<ReturnType<typeof getLocaleMessages>>, definition: PageDefinition | null, rowSeo: unknown) {
  const seo = rowSeo && typeof rowSeo === 'object' ? cloneJson(rowSeo as Record<string, unknown>) : {};

  if (seo.title || seo.description || !definition) {
    return seo;
  }

  const content = readStaticContent(messages, getPageContentGroups(definition)[0]?.sourcePath ?? definition.sourcePath);
  return {
    title: stringValue(getObjectValueAtPath(content, 'hero.title')) || stringValue(getObjectValueAtPath(content, 'title')) || definition.title,
    description:
      stringValue(getObjectValueAtPath(content, 'hero.subtitle')) ||
      stringValue(getObjectValueAtPath(content, 'hero.body')) ||
      stringValue(getObjectValueAtPath(content, 'subtitle')) ||
      stringValue(getObjectValueAtPath(content, 'notice')),
    ogImagePath: stringValue(getObjectValueAtPath(content, 'hero.image')) || stringValue(getObjectValueAtPath(content, 'image'))
  };
}

function countLocaleFields(data: PageLocaleData | undefined, definition: PageDefinition | null) {
  if (!data) {
    return 0;
  }

  return data.groups.reduce((total, group) => {
    if (!definition) {
      return total + getEditableLeafCount(group.content);
    }

    return total + getEditableLeafCountForPageGroup(definition, group.key, group.content);
  }, 0);
}

async function getMediaLibraryItems(): Promise<MediaLibraryItem[]> {
  return (await listMedia()).map((item) => ({
    filename: item.filename,
    url: item.url,
    alt: item.altKo || item.altEn || item.filename
  }));
}

function contentFieldName(locale: Locale, groupKey: string, path: string) {
  return `contentField.${locale}.${groupKey}.${path}`;
}

function contentImageFieldName(locale: Locale, groupKey: string, path: string) {
  return `contentImage.${locale}.${groupKey}.${path}`;
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function stringValue(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
}

function shouldUseTextarea(path: string, value: string) {
  const key = lastPathSegment(path);
  return value.length > 80 || value.includes('\n') || ['body', 'subtitle', 'description', 'notice', 'story', 'answer', 'message', 'lead', 'quote'].includes(key);
}

function textareaRows(value: string) {
  return Math.min(Math.max(value.split('\n').length + 2, value.length > 180 ? 5 : 3), 10);
}

function labelForPath(path: string, value: unknown, adminLocale: AdminLocale) {
  const segment = lastPathSegment(path);

  if (/^\d+$/.test(segment)) {
    return itemTitle(value, Number(segment), adminLocale);
  }

  return getLocalizedPathLabel(segment, adminLocale);
}

function itemTitle(value: unknown, index: number, adminLocale: AdminLocale) {
  const item = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  const title = item ? stringValue(item.frontTitle || item.backTitle || item.title || item.label || item.question || item.year || item.id) : '';
  const prefix = adminLocale === 'ko' ? '항목' : adminLocale === 'en' ? 'Item' : '项目';

  return title ? `${prefix} ${index + 1} - ${title}` : `${prefix} ${index + 1}`;
}

function arrayItemFieldValue(item: Record<string, unknown>, field: PageArrayItemFieldDefinition) {
  const value = getObjectValueAtPath(item, field.path);

  if (value !== undefined) {
    return value;
  }

  return field.fallbackPath ? getObjectValueAtPath(item, field.fallbackPath) : '';
}

function appendItemTitle(adminLocale: AdminLocale) {
  if (adminLocale === 'ko') {
    return '새 항목 추가';
  }

  if (adminLocale === 'en') {
    return 'Add item';
  }

  return '添加项目';
}

function appendItemHint(adminLocale: AdminLocale) {
  if (adminLocale === 'ko') {
    return '비워 두면 저장되지 않습니다.';
  }

  if (adminLocale === 'en') {
    return 'Leave empty to skip adding a new item.';
  }

  return '留空则不会新增。';
}

function appendItemButtonLabel(adminLocale: AdminLocale) {
  if (adminLocale === 'ko') {
    return '사진 카드 추가';
  }

  if (adminLocale === 'en') {
    return 'Add image card';
  }

  return '添加图片卡片';
}

function removeItemButtonLabel(adminLocale: AdminLocale) {
  if (adminLocale === 'ko') {
    return '삭제';
  }

  if (adminLocale === 'en') {
    return 'Remove';
  }

  return '删除';
}

const pageFieldLabels: Record<AdminLocale, Record<string, string>> = {
  zh: {
    hero: '首屏',
    eyebrow: '眉标',
    title: '标题',
    titleLines: '标题行',
    koreanTitle: '本地标题',
    subtitle: '副标题',
    body: '正文',
    image: '图片',
    primaryImage: '第一张图片',
    secondaryImage: '第二张图片',
    imagePrimary: '主图',
    imageDetail: '细节图',
    imageBox: '盒子图片',
    imageLifestyle: '场景图片',
    poster: '封面图',
    videoPoster: '视频封面',
    signature: 'Signature 区块',
    projects: '项目',
    rings: '戒指展示',
    stats: '数字统计',
    statBand: '数字带',
    pillars: '导流章节',
    golf: 'Golf 区块',
    timeline: '时间轴',
    items: '项目',
    metrics: '指标',
    statement: '说明',
    gallery: '图库',
    branches: '分支入口',
    details: '细节',
    closing: '结尾区块',
    process: '流程',
    steps: '步骤',
    bespoke: '定制区块',
    filters: '筛选项',
    masthead: '页头',
    grid: '列表',
    cards: '卡片',
    category: '分类',
    categoryLabel: '分类显示名',
    date: '日期',
    href: '链接',
    cta: '按钮文案',
    caption: '说明',
    value: '数值',
    suffix: '后缀',
    label: '标签',
    number: '编号',
    kicker: '小标题',
    year: '年份',
    first: '重点标记',
    specLabel: '规格标签',
    heads: '球杆头选项',
    shafts: '杆身颜色选项',
    engraving: '刻字区块',
    lifestyle: '生活方式区块',
    infoTitle: '联系信息标题',
    address: '地址',
    phone: '电话',
    email: '邮箱',
    hours: '营业时间',
    faqTitle: 'FAQ 标题',
    faqs: 'FAQ',
    question: '问题',
    answer: '回答',
    name: '姓名',
    organization: '公司/团队',
    contact: '联系方式',
    type: '类型',
    submit: '提交按钮',
    success: '成功提示',
    fallback: '失败提示',
    options: '选项',
    summary: '摘要标题',
    head: '球杆头标签',
    shaft: '杆身标签',
    edit: '返回编辑',
    nav: '导航',
    footer: '页脚',
    language: '语言',
    notice: '正文'
  },
  ko: {
    hero: '히어로',
    eyebrow: '상단 라벨',
    title: '제목',
    titleLines: '제목 줄',
    koreanTitle: '국문 제목',
    subtitle: '부제목',
    body: '본문',
    image: '이미지',
    primaryImage: '첫 번째 이미지',
    secondaryImage: '두 번째 이미지',
    imagePrimary: '대표 이미지',
    imageDetail: '상세 이미지',
    imageBox: '박스 이미지',
    imageLifestyle: '라이프스타일 이미지',
    poster: '포스터',
    videoPoster: '영상 포스터',
    signature: '시그니처 섹션',
    projects: '프로젝트',
    rings: '반지 전시',
    stats: '숫자 통계',
    statBand: '숫자 영역',
    pillars: '이동 섹션',
    golf: '골프 섹션',
    timeline: '타임라인',
    items: '항목',
    metrics: '지표',
    statement: '설명',
    gallery: '갤러리',
    branches: '분기 링크',
    details: '상세',
    closing: '마무리 섹션',
    process: '프로세스',
    steps: '단계',
    bespoke: '주문제작 섹션',
    filters: '필터',
    masthead: '페이지 헤더',
    grid: '목록',
    cards: '카드',
    category: '분류',
    categoryLabel: '분류 표시명',
    date: '날짜',
    href: '링크',
    cta: '버튼 문구',
    caption: '설명',
    value: '값',
    suffix: '접미사',
    label: '라벨',
    number: '번호',
    kicker: '소제목',
    year: '연도',
    first: '강조 표시',
    specLabel: '사양 라벨',
    heads: '헤드 옵션',
    shafts: '샤프트 색상 옵션',
    engraving: '각인 섹션',
    lifestyle: '라이프스타일 섹션',
    infoTitle: '연락처 제목',
    address: '주소',
    phone: '전화',
    email: '이메일',
    hours: '운영 시간',
    faqTitle: 'FAQ 제목',
    faqs: 'FAQ',
    question: '질문',
    answer: '답변',
    name: '이름',
    organization: '회사/팀',
    contact: '연락처',
    type: '유형',
    submit: '제출 버튼',
    success: '성공 메시지',
    fallback: '오류 메시지',
    options: '옵션',
    summary: '요약 제목',
    head: '헤드 라벨',
    shaft: '샤프트 라벨',
    edit: '수정 링크',
    nav: '내비게이션',
    footer: '푸터',
    language: '언어',
    notice: '본문'
  },
  en: {
    hero: 'Hero',
    eyebrow: 'Eyebrow',
    title: 'Title',
    titleLines: 'Title lines',
    koreanTitle: 'Local title',
    subtitle: 'Subtitle',
    body: 'Body',
    image: 'Image',
    primaryImage: 'First image',
    secondaryImage: 'Second image',
    imagePrimary: 'Primary image',
    imageDetail: 'Detail image',
    imageBox: 'Box image',
    imageLifestyle: 'Lifestyle image',
    poster: 'Poster',
    videoPoster: 'Video poster',
    signature: 'Signature section',
    projects: 'Projects',
    rings: 'Ring showcase',
    stats: 'Stats',
    statBand: 'Stat band',
    pillars: 'Entry sections',
    golf: 'Golf section',
    timeline: 'Timeline',
    items: 'Items',
    metrics: 'Metrics',
    statement: 'Statement',
    gallery: 'Gallery',
    branches: 'Branch links',
    details: 'Details',
    closing: 'Closing section',
    process: 'Process',
    steps: 'Steps',
    bespoke: 'Bespoke section',
    filters: 'Filters',
    masthead: 'Masthead',
    grid: 'Grid',
    cards: 'Cards',
    category: 'Category',
    categoryLabel: 'Category label',
    date: 'Date',
    href: 'Link',
    cta: 'CTA text',
    caption: 'Caption',
    value: 'Value',
    suffix: 'Suffix',
    label: 'Label',
    number: 'Number',
    kicker: 'Kicker',
    year: 'Year',
    first: 'Featured flag',
    specLabel: 'Spec label',
    heads: 'Club head options',
    shafts: 'Shaft color options',
    engraving: 'Engraving section',
    lifestyle: 'Lifestyle section',
    infoTitle: 'Contact info title',
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    hours: 'Business hours',
    faqTitle: 'FAQ title',
    faqs: 'FAQ',
    question: 'Question',
    answer: 'Answer',
    name: 'Name',
    organization: 'Organization/team',
    contact: 'Contact',
    type: 'Type',
    submit: 'Submit button',
    success: 'Success message',
    fallback: 'Error message',
    options: 'Options',
    summary: 'Summary title',
    head: 'Club head label',
    shaft: 'Shaft label',
    edit: 'Edit link',
    nav: 'Navigation',
    footer: 'Footer',
    language: 'Language',
    notice: 'Body'
  }
};

function humanizeKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function lastPathSegment(path: string) {
  return path.split('.').at(-1) ?? path;
}
