import pageCatalogData from './page-catalog.json';

export type PageFieldType = 'text' | 'textarea' | 'image' | 'select' | 'stringList' | 'json';

export type PageFieldOption = {
  label: string;
  value: string;
  labels?: Record<string, string>;
};

export type PageFieldEditorSettings = {
  font?: 'maruburi-semibold' | 'cormorant-garamond-700';
  align?: 'left' | 'center' | 'right';
};

export type PageArrayItemFieldDefinition = {
  path: string;
  label: string;
  labels?: Record<string, string>;
  type?: PageFieldType;
  rows?: number;
  placeholder?: string;
  fallbackPath?: string;
  options?: PageFieldOption[];
  editor?: PageFieldEditorSettings;
};

export type PageFieldDefinition = {
  groupKey?: string;
  path: string;
  label: string;
  labels?: Record<string, string>;
  type?: PageFieldType;
  rows?: number;
  placeholder?: string;
  itemFields?: PageArrayItemFieldDefinition[];
  options?: PageFieldOption[];
  editor?: PageFieldEditorSettings;
};

export type PageContentGroupDefinition = {
  key: string;
  title: string;
  sourcePath: string;
};

export type PageDefinition = {
  pageKey: string;
  title: string;
  description: string;
  section: string;
  sortOrder: number;
  href: string;
  sourcePath: string;
  contentGroups?: PageContentGroupDefinition[];
  fields: PageFieldDefinition[];
};

export const managedPageDefinitions = pageCatalogData as PageDefinition[];
export const pageContentGroupsKey = '__groups';

export type EditableLeaf = {
  path: string;
  value: unknown;
  valueType: 'string' | 'number' | 'boolean' | 'empty';
  isImage: boolean;
};

export function getManagedPageDefinition(pageKey: string) {
  return managedPageDefinitions.find((page) => page.pageKey === pageKey) ?? null;
}

export function getPageContentGroups(definition: PageDefinition) {
  if (definition.contentGroups?.length) {
    return definition.contentGroups;
  }

  return [
    {
      key: 'main',
      title: definition.title,
      sourcePath: definition.sourcePath
    }
  ];
}

export function getPageContentGroupOverride(content: unknown, groupKey: string) {
  if (!isPlainObject(content)) {
    return {};
  }

  const groups = content[pageContentGroupsKey];

  if (isPlainObject(groups)) {
    const groupContent = groups[groupKey];
    return isPlainObject(groupContent) ? groupContent : {};
  }

  return groupKey === 'main' ? content : {};
}

export function createPageContentPayload(
  definition: PageDefinition,
  groups: Record<string, Record<string, unknown>>
) {
  const contentGroups = getPageContentGroups(definition);

  if (contentGroups.length === 1 && contentGroups[0]?.key === 'main') {
    return cloneJson(groups.main ?? {});
  }

  return {
    [pageContentGroupsKey]: cloneJson(groups)
  };
}

export function getObjectValueAtPath(value: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current == null) {
      return undefined;
    }

    const key = Number.isInteger(Number(segment)) && Array.isArray(current) ? Number(segment) : segment;
    return (current as Record<string, unknown>)[key as keyof typeof current];
  }, value);
}

export function getPageFieldDefinitionsForGroup(
  definition: PageDefinition,
  groupKey: string,
  content: Record<string, unknown>
) {
  const groups = getPageContentGroups(definition);
  const hasMultipleGroups = groups.length > 1;

  return definition.fields.filter((field) => {
    if (field.groupKey) {
      return field.groupKey === groupKey;
    }

    if (!hasMultipleGroups) {
      return groupKey === 'main';
    }

    return getObjectValueAtPath(content, field.path) !== undefined;
  });
}

export function getEditableLeavesForPageGroup(
  definition: PageDefinition,
  groupKey: string,
  content: Record<string, unknown>
) {
  const fields = getPageFieldDefinitionsForGroup(definition, groupKey, content);
  const leaves: EditableLeaf[] = [];
  const seenPaths = new Set<string>();

  for (const field of fields) {
    const value = getObjectValueAtPath(content, field.path);
    const fieldLeaves = Array.isArray(value) && field.itemFields?.length
      ? getEditableArrayItemFieldLeaves(value, field.path, field.itemFields)
      : getEditableLeaves(value, field.path);

    for (const leaf of fieldLeaves) {
      if (seenPaths.has(leaf.path)) {
        continue;
      }

      seenPaths.add(leaf.path);
      leaves.push({
        ...leaf,
        isImage: field.type === 'image' || leaf.isImage
      });
    }
  }

  return leaves;
}

function getEditableArrayItemFieldLeaves(
  items: unknown[],
  path: string,
  itemFields: PageArrayItemFieldDefinition[]
) {
  const leaves: EditableLeaf[] = [];

  items.forEach((item, index) => {
    const itemObject = isPlainObject(item) ? item : {};

    for (const itemField of itemFields) {
      const fieldPath = joinPath(joinPath(path, String(index)), itemField.path);
      const value = getArrayItemFieldValue(itemObject, itemField);

      leaves.push({
        path: fieldPath,
        value,
        valueType: getEditableLeafValueType(value),
        isImage: itemField.type === 'image' || isImageEditableField(fieldPath, value)
      });
    }
  });

  return leaves;
}

function getArrayItemFieldValue(item: Record<string, unknown>, itemField: PageArrayItemFieldDefinition) {
  const value = getObjectValueAtPath(item, itemField.path);

  if (value !== undefined) {
    return value;
  }

  if (itemField.fallbackPath) {
    const fallback = getObjectValueAtPath(item, itemField.fallbackPath);

    if (fallback !== undefined) {
      return fallback;
    }
  }

  return '';
}

function getEditableLeafValueType(value: unknown): EditableLeaf['valueType'] {
  if (typeof value === 'number') {
    return 'number';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (value == null || value === '') {
    return 'empty';
  }

  return 'string';
}

export function getEditableLeafCountForPageGroup(
  definition: PageDefinition,
  groupKey: string,
  content: Record<string, unknown>
) {
  return getEditableLeavesForPageGroup(definition, groupKey, content).length;
}

export function setObjectValueAtPath(target: Record<string, unknown>, path: string, value: unknown) {
  const segments = path.split('.');
  let current: Record<string, unknown> | unknown[] = target;

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    const nextSegment = segments[index + 1];
    const key = Array.isArray(current) && isNumericPathSegment(segment) ? Number(segment) : segment;

    if (isLast) {
      current[key as keyof typeof current] = value as never;
      return;
    }

    const shouldBeArray = isNumericPathSegment(nextSegment);
    const existing = current[key as keyof typeof current];

    if (!isContainer(existing)) {
      current[key as keyof typeof current] = (shouldBeArray ? [] : {}) as never;
    }

    current = current[key as keyof typeof current] as Record<string, unknown> | unknown[];
  });

  return target;
}

export function getEditableLeaves(value: unknown, path = ''): EditableLeaf[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => getEditableLeaves(item, joinPath(path, String(index))));
  }

  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, item]) => getEditableLeaves(item, joinPath(path, key)));
  }

  if (typeof value === 'string') {
    return [
      {
        path,
        value,
        valueType: 'string',
        isImage: isImageEditableField(path, value)
      }
    ];
  }

  if (typeof value === 'number') {
    return [
      {
        path,
        value,
        valueType: 'number',
        isImage: false
      }
    ];
  }

  if (typeof value === 'boolean') {
    return [
      {
        path,
        value,
        valueType: 'boolean',
        isImage: false
      }
    ];
  }

  if (value == null) {
    return [
      {
        path,
        value: '',
        valueType: 'empty',
        isImage: isImageEditableField(path, '')
      }
    ];
  }

  return [];
}

export function isImageEditableField(pathValue: string, value: unknown) {
  const normalizedPath = pathValue.toLowerCase();
  const stringValue = typeof value === 'string' ? value.toLowerCase() : '';
  const imagePathKeys = [
    'image',
    'poster',
    'thumbnail',
    'ogimage',
    'ogimagepath',
    'imagepath',
    'imageprimary',
    'imagedetail',
    'imagebox',
    'imagelifestyle',
    'videoposter'
  ];
  const normalizedKeyPath = normalizedPath.replace(/[^a-z0-9]+/g, '');

  return (
    imagePathKeys.some((key) => normalizedKeyPath.includes(key)) ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(stringValue)
  );
}

export function getEditableLeafCount(value: unknown) {
  return getEditableLeaves(value).length;
}

export function deepMergeJson<T>(base: T, override: unknown): T {
  if (Array.isArray(base) || Array.isArray(override)) {
    return cloneJson((override ?? base) as T);
  }

  if (!isPlainObject(base) || !isPlainObject(override)) {
    return cloneJson((override ?? base) as T);
  }

  const merged: Record<string, unknown> = {...base};

  for (const [key, value] of Object.entries(override)) {
    merged[key] = key in merged ? deepMergeJson(merged[key], value) : cloneJson(value);
  }

  return merged as T;
}

export function cloneJson<T>(value: T): T {
  if (value == null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function isContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return isPlainObject(value) || Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isNumericPathSegment(value: string | undefined) {
  return Boolean(value && /^\d+$/.test(value));
}

function joinPath(base: string, segment: string) {
  return base ? `${base}.${segment}` : segment;
}
