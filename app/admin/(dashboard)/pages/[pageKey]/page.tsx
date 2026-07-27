import Link from 'next/link';
import {notFound, redirect} from 'next/navigation';

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
  type PageFieldEditorSettings,
  type PageFieldDefinition,
  type PageFieldOption,
  type PageFieldType
} from '@/lib/cms/page-catalog';
import {
  getLocalizedArrayItemFields,
  getLocalizedContentGroupTitle,
  getLocalizedPageDescription,
  getLocalizedPageFieldLabel,
  getLocalizedPageFieldOptions,
  getLocalizedPageTitle,
  getLocalizedPathLabel
} from '@/lib/cms/page-catalog-i18n';
import {getAdminImageGuide, getPageImageGuide} from '@/lib/cms/image-guides';
import {getPage, listMedia} from '@/lib/cms/repositories';
import {
  pairTechniqueRecords,
  type TechniqueLocaleRecord
} from '@/lib/cms/technique-records-core.mjs';
import {getLocaleMessages} from '@/lib/locale-messages';
import {localeFieldSuffixes, locales, type Locale} from '@/lib/locales';

import {savePageAction} from '../../../actions';
import {AdminActionAlert} from '../../../_components/admin-feedback';
import {AppendableArrayItemsField, ImageUploadField, SelectField, SubmitButton, TextAreaField, TextField, type MediaLibraryItem} from '../../../_components/admin-fields';
import {PageHeader, Panel} from '../../../_components/admin-shell';
import {ContentLocaleForm, ContentLocalePanel} from '../../../_components/content-locale-editor';
import {TechniqueRecordsEditor} from '../../../_components/technique-records-editor';

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
  pageKey: string;
  adminLocale: AdminLocale;
  locale: Locale;
  groupKey: string;
  mediaItems: MediaLibraryItem[];
  messages: Record<string, string>;
};

const hiddenKeys = new Set(['id']);

export default async function AdminPageEditor({params, searchParams}: Props) {
  const {pageKey} = await params;

  if (pageKey === 'common') {
    redirect('/admin/footer');
  }

  const {locale: adminLocale, messages, t} = await getAdminI18n();
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
  const techniqueEditor = pageKey === 'mastery-technique';
  const techniqueDrafts = techniqueEditor
    ? pairTechniqueRecords(
        techniqueRecordItems(localeData, 'ko'),
        techniqueRecordItems(localeData, 'en')
      )
    : [];

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

      <ContentLocaleForm
        action={savePageAction}
        className="grid gap-6 pb-24"
        label={t('contentLocale.editorLabel')}
        localeLabels={{
          ko: t('contentLocale.ko'),
          en: t('contentLocale.en')
        }}
      >
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

        {techniqueEditor ? (
          <TechniqueRecordsEditor
            drafts={techniqueDrafts}
            mediaItems={mediaItems}
            imageGuide={getPageImageGuide({
              pageKey,
              groupKey: 'main',
              path: 'records.items.0.image',
              locale: adminLocale
            })}
            labels={{
              title: t('techniqueRecords.title'),
              hint: t('techniqueRecords.hint'),
              add: t('techniqueRecords.add'),
              moveUp: t('techniqueRecords.moveUp'),
              moveDown: t('techniqueRecords.moveDown'),
              delete: t('techniqueRecords.delete'),
              confirmDelete: t('techniqueRecords.confirmDelete'),
              sharedImage: t('techniqueRecords.sharedImage'),
              ko: t('techniqueRecords.ko'),
              en: t('techniqueRecords.en'),
              minimumThree: t('techniqueRecords.minimumThree'),
              fieldTitle: t('techniqueRecords.fieldTitle'),
              fieldBody: t('techniqueRecords.fieldBody'),
              uploadLabel: t('page.uploadLocalImage'),
              uploadHint: t('page.uploadLocalImageHint'),
              emptyImageLabel: t('common.noImage'),
              changedLabel: t('common.changed'),
              selectedLabel: t('common.imageSelected'),
              syncedLabel: t('common.imageSynced'),
              mediaSelectLabel: t('media.selectFromLibrary'),
              mediaLibraryTitle: t('media.libraryTitle'),
              mediaEmptyLabel: t('media.libraryEmpty'),
              mediaSelectedLabel: t('media.selectedExisting')
            }}
          />
        ) : null}

        <div className="grid gap-6">
          {localeData.map((data) => (
            <ContentLocalePanel key={data.locale} locale={data.locale}>
              <PageLocalePanel
                locale={data.locale}
                groups={data.groups}
                seo={data.seo}
                definition={definition}
                adminLocale={adminLocale}
                mediaItems={mediaItems}
                messages={messages}
                excludedFieldPaths={techniqueEditor ? ['records.items'] : []}
              />
            </ContentLocalePanel>
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
      </ContentLocaleForm>
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
  messages,
  excludedFieldPaths
}: {
  locale: Locale;
  groups: PageLocaleContentGroup[];
  seo: Record<string, unknown>;
  definition: PageDefinition | null;
  adminLocale: AdminLocale;
  mediaItems: MediaLibraryItem[];
  messages: Record<string, string>;
  excludedFieldPaths: string[];
}) {
  const suffix = localeFieldSuffixes[locale];
  const t = createAdminTranslator(messages);

  return (
    <Panel className="min-w-0 p-5">
      <textarea hidden readOnly name={`seo${suffix}`} value={formatJson(seo)} />
      {groups.map((group) => (
        <textarea key={group.key} hidden readOnly name={`content${suffix}.${group.key}`} value={formatJson(group.content)} />
      ))}

      <h2 className="mb-4 border-b border-[#e4e7ec] pb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">
        {getContentLocaleLabel(messages, locale)}
      </h2>

      <div className="grid gap-5">
        {groups.map((group) => {
          const context = {pageKey: definition?.pageKey ?? '', adminLocale, locale, groupKey: group.key, mediaItems, messages};
          const fields = definition
            ? getPageFieldDefinitionsForGroup(definition, group.key, group.content)
                .filter((field) => !excludedFieldPaths.includes(field.path))
            : null;

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
            imageGuide={getPageSeoImageGuide(adminLocale)}
            syncKey="page-seo:ogImagePath"
          />
        </section>
      </div>
    </Panel>
  );
}

function techniqueRecordItems(localeData: PageLocaleData[], locale: Locale) {
  const data = localeData.find((item) => item.locale === locale);
  const group = data?.groups.find((item) => item.key === 'main');
  const records = getObjectValueAtPath(group?.content ?? {}, 'records.items');

  return Array.isArray(records) ? records as TechniqueLocaleRecord[] : [];
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
                options={getLocalizedPageFieldOptions(field, context.adminLocale)}
                rows={field.rows}
                fieldType={field.type}
                editorFont={field.editor?.font}
                editorAlign={field.editor?.align}
                maxItems={field.maxItems}
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
  options,
  rows,
  editorFont,
  editorAlign,
  fieldType,
  maxItems
}: {
  path: string;
  label: string;
  value: unknown;
  context: RenderContext;
  depth: number;
  forceImage?: boolean;
  itemFields?: PageArrayItemFieldDefinition[];
  options?: PageFieldOption[];
  rows?: number;
  editorFont?: PageFieldEditorSettings['font'];
  editorAlign?: PageFieldEditorSettings['align'];
  fieldType?: PageFieldType;
  maxItems?: number;
}) {
  if (hiddenKeys.has(lastPathSegment(path))) {
    return <input type="hidden" name={contentFieldName(context.locale, context.groupKey, path)} value={stringValue(value)} />;
  }

  if (Array.isArray(value)) {
    return (
      <EditableArray
        path={path}
        label={label}
        value={value}
        context={context}
        depth={depth}
        itemFields={itemFields}
        editorFont={editorFont}
        editorAlign={editorAlign}
        maxItems={maxItems}
      />
    );
  }

  if (value && typeof value === 'object') {
    return <EditableGroup path={path} label={label} value={value as Record<string, unknown>} context={context} depth={depth} />;
  }

  return (
    <EditableLeaf
      path={path}
      label={label}
      value={value}
      context={context}
      forceImage={forceImage}
      options={options}
      rows={rows}
      editor={{font: editorFont, align: editorAlign}}
      fieldType={fieldType}
    />
  );
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
  itemFields,
  editorFont,
  editorAlign,
  maxItems
}: {
  path: string;
  label: string;
  value: unknown[];
  context: RenderContext;
  depth: number;
  itemFields?: PageArrayItemFieldDefinition[];
  editorFont?: PageFieldEditorSettings['font'];
  editorAlign?: PageFieldEditorSettings['align'];
  maxItems?: number;
}) {
  if (value.length === 0) {
    return (
      <section className="grid min-w-0 w-full max-w-full gap-4 rounded-md border border-[#e4e7ec] bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{label}</h3>
        <p className="mt-2 text-sm text-[#98a2b3]">{createAdminTranslator(context.messages)('page.emptySection')}</p>
        {itemFields?.length && (maxItems === undefined || maxItems > 0) ? (
          <AppendArrayItems path={path} startIndex={0} context={context} itemFields={itemFields} maxItems={maxItems} />
        ) : null}
      </section>
    );
  }

  return (
    <section className="grid min-w-0 w-full max-w-full gap-4 rounded-md border border-[#e4e7ec] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{label}</h3>
        <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1 text-xs font-semibold text-[#647084]">
          {value.length}
        </span>
      </div>
      <div className="grid min-w-0 w-full max-w-full gap-3">
        {value.map((item, index) => (
          <div key={`${path}.${index}`} className="grid min-w-0 w-full max-w-full gap-4 rounded-md border border-[#eef2f6] bg-[#fbfcfe] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#98a2b3]">
              {itemTitle(item, index, context.adminLocale, itemFields)}
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
                editorFont={editorFont}
                editorAlign={editorAlign}
              />
            )}
          </div>
        ))}
      </div>
      {itemFields?.length && (maxItems === undefined || value.length < maxItems) ? (
        <AppendArrayItems
          path={path}
          startIndex={value.length}
          context={context}
          itemFields={itemFields}
          maxItems={maxItems}
        />
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
    <div className="grid min-w-0 w-full max-w-full gap-4">
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
              imageGuide={getPageImageGuide({
                pageKey: context.pageKey,
                groupKey: context.groupKey,
                path: fieldPath,
                locale: context.adminLocale
              })}
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
              editorFont={field.editor?.font}
              editorAlign={field.editor?.align}
              editorLocale={context.locale}
            />
          );
        }

        if (field.type === 'select' && field.options?.length) {
          return (
            <SelectField
              key={field.path}
              label={field.label}
              name={name}
              defaultValue={stringValue(fieldValue)}
              options={field.options}
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
            inputMode={field.type === 'link' ? 'url' : undefined}
            editorControls={field.type !== 'link'}
            editorFont={field.editor?.font}
            editorAlign={field.editor?.align}
            editorLocale={context.locale}
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
  itemFields,
  maxItems
}: {
  path: string;
  startIndex: number;
  context: RenderContext;
  itemFields: PageArrayItemFieldDefinition[];
  maxItems?: number;
}) {
  const t = createAdminTranslator(context.messages);

  return (
    <AppendableArrayItemsField
      path={path}
      startIndex={startIndex}
      locale={context.locale}
      groupKey={context.groupKey}
      itemFields={itemFields}
      maxItems={maxItems}
      mediaItems={context.mediaItems}
      imageGuides={Object.fromEntries(
        itemFields
          .filter((field) => field.type === 'image')
          .map((field) => [
            field.path,
            getPageImageGuide({
              pageKey: context.pageKey,
              groupKey: context.groupKey,
              path: `${path}.0.${field.path}`,
              locale: context.adminLocale
            })
          ])
      )}
      title={appendItemTitle(context.adminLocale)}
      hint={appendItemHint(context.adminLocale, maxItems)}
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
  options,
  rows,
  editor,
  fieldType
}: {
  path: string;
  label: string;
  value: unknown;
  context: RenderContext;
  forceImage?: boolean;
  options?: PageFieldOption[];
  rows?: number;
  editor?: PageFieldEditorSettings;
  fieldType?: PageFieldType;
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
        imageGuide={getPageImageGuide({
          pageKey: context.pageKey,
          groupKey: context.groupKey,
          path,
          locale: context.adminLocale
        })}
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

  if (fieldType === 'link') {
    return (
      <TextField
        label={label}
        name={name}
        defaultValue={text}
        placeholder="/contact, https://…, mailto:…"
        inputMode="url"
        editorControls={false}
      />
    );
  }

  if (options?.length) {
    return <SelectField label={label} name={name} defaultValue={text} options={options} />;
  }

  if (rows || shouldUseTextarea(path, text)) {
    return (
      <TextAreaField
        label={label}
        name={name}
        defaultValue={text}
        rows={rows ?? textareaRows(text)}
        editorFont={editor?.font}
        editorAlign={editor?.align}
        editorLocale={context.locale}
      />
    );
  }

  return (
    <TextField
      label={label}
      name={name}
      defaultValue={text}
      editorFont={editor?.font}
      editorAlign={editor?.align}
      editorLocale={context.locale}
    />
  );
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

function getPageSeoImageGuide(adminLocale: AdminLocale) {
  return getAdminImageGuide('seo', adminLocale);
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

function itemTitle(
  value: unknown,
  index: number,
  adminLocale: AdminLocale,
  itemFields?: PageArrayItemFieldDefinition[]
) {
  if (itemFields?.length === 1 && itemFields[0]?.path === 'image') {
    const imagePrefix = adminLocale === 'ko' ? '이미지' : adminLocale === 'en' ? 'Image' : '图片';

    return `${imagePrefix} ${index + 1}`;
  }

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

function appendItemHint(adminLocale: AdminLocale, maxItems?: number) {
  const limit = maxItems
    ? adminLocale === 'ko'
      ? `최대 ${maxItems}개까지 저장할 수 있습니다. `
      : adminLocale === 'en'
        ? `You can save up to ${maxItems} items. `
        : `最多可保存 ${maxItems} 个。`
    : '';

  if (adminLocale === 'ko') {
    return `${limit}비워 두면 저장되지 않습니다.`;
  }

  if (adminLocale === 'en') {
    return `${limit}Leave empty to skip adding a new item.`;
  }

  return `${limit}留空则不会新增。`;
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

function lastPathSegment(path: string) {
  return path.split('.').at(-1) ?? path;
}
