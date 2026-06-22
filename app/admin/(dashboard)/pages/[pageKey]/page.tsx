import Link from 'next/link';
import {notFound} from 'next/navigation';

import {createAdminTranslator, getAdminI18n, getContentLocaleLabel} from '@/lib/admin-i18n';
import {
  cloneJson,
  getPageContentGroupOverride,
  getPageContentGroups,
  deepMergeJson,
  getEditableLeafCount,
  getManagedPageDefinition,
  getObjectValueAtPath,
  isImageEditableField,
  type PageDefinition
} from '@/lib/cms/page-catalog';
import {getPage} from '@/lib/cms/repositories';
import {getLocaleMessages} from '@/lib/locale-messages';
import {localeFieldSuffixes, locales, type Locale} from '@/lib/locales';

import {savePageAction} from '../../../actions';
import {ImageUploadField, SubmitButton, TextAreaField, TextField} from '../../../_components/admin-fields';
import {PageHeader, Panel} from '../../../_components/admin-shell';

type Props = {
  params: Promise<{pageKey: string}>;
  searchParams?: Promise<{error?: string}>;
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
  locale: Locale;
  groupKey: string;
  messages: Record<string, string>;
};

const hiddenKeys = new Set(['id']);

export default async function AdminPageEditor({params, searchParams}: Props) {
  const {messages, t} = await getAdminI18n();
  const {pageKey} = await params;
  const query = await searchParams;
  const definition = getManagedPageDefinition(pageKey);
  const row = getPage(pageKey);

  if (!definition && !row) {
    notFound();
  }

  const page = {
    pageKey,
    section: row?.section ?? definition?.section ?? 'site',
    sortOrder: row?.sortOrder ?? definition?.sortOrder ?? 0
  };
  const localeData = locales.map((locale) => getPageLocaleData(locale, definition, row));
  const title = definition?.title ?? page.pageKey;

  return (
    <>
      <PageHeader
        title={t('page.editTitle', {pageKey: title})}
        description={definition?.description ?? t('page.editDescription')}
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

      {query?.error === 'file' ? (
        <div className="mb-5 rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-4 py-3 text-sm font-semibold text-[#b42318]">
          {t('page.uploadError')}
        </div>
      ) : null}

      <form action={savePageAction} encType="multipart/form-data" className="grid gap-6">
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
              <span className="rounded bg-[#f8fafc] px-2 py-1 ring-1 ring-[#e4e7ec]">{t('page.fieldCount', {count: countLocaleFields(localeData[0])})}</span>
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
      </form>
    </>
  );
}

function PageLocalePanel({
  locale,
  groups,
  seo,
  messages
}: {
  locale: Locale;
  groups: PageLocaleContentGroup[];
  seo: Record<string, unknown>;
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
          const context = {locale, groupKey: group.key, messages};

          return (
            <ContentGroupEditor key={group.key} group={group} context={context} />
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
          />
        </section>
      </div>
    </Panel>
  );
}

function ContentGroupEditor({
  group,
  context
}: {
  group: PageLocaleContentGroup;
  context: RenderContext;
}) {
  const entries = Object.entries(group.content);

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-4 rounded-md border border-[#d9dee7] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eef2f6] pb-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{group.title}</h3>
        </div>
        <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1 text-xs font-semibold text-[#647084]">
          {getEditableLeafCount(group.content)}
        </span>
      </div>
      <div className="grid gap-4">
        {entries.map(([key, value]) => (
          <EditableNode key={key} path={key} label={labelForKey(key)} value={value} context={context} depth={0} />
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
  depth
}: {
  path: string;
  label: string;
  value: unknown;
  context: RenderContext;
  depth: number;
}) {
  if (hiddenKeys.has(lastPathSegment(path))) {
    return <input type="hidden" name={contentFieldName(context.locale, context.groupKey, path)} value={stringValue(value)} />;
  }

  if (Array.isArray(value)) {
    return <EditableArray path={path} label={label} value={value} context={context} depth={depth} />;
  }

  if (value && typeof value === 'object') {
    return <EditableGroup path={path} label={label} value={value as Record<string, unknown>} context={context} depth={depth} />;
  }

  return <EditableLeaf path={path} label={label} value={value} context={context} />;
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
              label={labelForPath(`${path}.${key}`, item)}
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
            label={labelForPath(`${path}.${key}`, item)}
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
  depth
}: {
  path: string;
  label: string;
  value: unknown[];
  context: RenderContext;
  depth: number;
}) {
  if (value.length === 0) {
    return (
      <section className="rounded-md border border-[#e4e7ec] bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{label}</h3>
        <p className="mt-2 text-sm text-[#98a2b3]">{createAdminTranslator(context.messages)('page.emptySection')}</p>
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
              {itemTitle(item, index)}
            </p>
            <EditableNode
              path={`${path}.${index}`}
              label={labelForPath(`${path}.${index}`, item)}
              value={item}
              context={context}
              depth={depth + 1}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function EditableLeaf({
  path,
  label,
  value,
  context
}: {
  path: string;
  label: string;
  value: unknown;
  context: RenderContext;
}) {
  const name = contentFieldName(context.locale, context.groupKey, path);
  const t = createAdminTranslator(context.messages);

  if (isImageEditableField(path, value)) {
    return (
      <ImageUploadField
        label={label}
        name={name}
        uploadName={contentImageFieldName(context.locale, context.groupKey, path)}
        defaultValue={stringValue(value)}
        placeholder="image-name.png"
        uploadLabel={t('page.uploadLocalImage')}
        uploadHint={t('page.uploadLocalImageHint')}
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

  if (shouldUseTextarea(path, text)) {
    return <TextAreaField label={label} name={name} defaultValue={text} rows={textareaRows(text)} />;
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

function getPageLocaleData(locale: Locale, definition: PageDefinition | null, row: ReturnType<typeof getPage>): PageLocaleData {
  const rowContent = row?.content[locale] ?? {};
  const groups = definition
    ? getPageContentGroups(definition).map((group) => {
        const fallbackContent = readStaticContent(locale, group.sourcePath);
        const overrideContent = getPageContentGroupOverride(rowContent, group.key);

        return {
          ...group,
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
    seo: getSeoFallback(locale, definition, row?.seo[locale])
  };
}

function readStaticContent(locale: Locale, sourcePath: string) {
  const messages = getLocaleMessages(locale);
  const content = getObjectValueAtPath(messages, sourcePath);

  return cloneJson((content && typeof content === 'object' ? content : {}) as Record<string, unknown>);
}

function getSeoFallback(locale: Locale, definition: PageDefinition | null, rowSeo: unknown) {
  const seo = rowSeo && typeof rowSeo === 'object' ? cloneJson(rowSeo as Record<string, unknown>) : {};

  if (seo.title || seo.description || !definition) {
    return seo;
  }

  const content = readStaticContent(locale, getPageContentGroups(definition)[0]?.sourcePath ?? definition.sourcePath);
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

function countLocaleFields(data: PageLocaleData | undefined) {
  return data?.groups.reduce((total, group) => total + getEditableLeafCount(group.content), 0) ?? 0;
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

function labelForPath(path: string, value: unknown) {
  const segment = lastPathSegment(path);

  if (/^\d+$/.test(segment)) {
    return itemTitle(value, Number(segment));
  }

  return labelForKey(segment);
}

function labelForKey(key: string) {
  const labels: Record<string, string> = {
    hero: '首屏',
    eyebrow: '眉标',
    title: '标题',
    titleLines: '标题行',
    koreanTitle: '本地标题',
    subtitle: '副标题',
    body: '正文',
    image: '图片',
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
  };

  return labels[key] ?? humanizeKey(key);
}

function itemTitle(value: unknown, index: number) {
  const item = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  const title = item ? stringValue(item.title || item.label || item.question || item.year || item.id) : '';
  return title ? `项目 ${index + 1} - ${title}` : `项目 ${index + 1}`;
}

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
