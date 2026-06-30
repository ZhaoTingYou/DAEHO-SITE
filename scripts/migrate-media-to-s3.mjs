import {existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const pruneUnused = args.has('--prune-unused');
const localBaseUrl = process.env.CMS_LOCAL_BASE_URL ?? 'http://localhost:18180';
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);

loadEnvFile(path.join(root, '.env'));

const adminKey = process.env.CMS_BACKEND_API_KEY ?? process.env.CMS_ADMIN_API_KEY ?? '';
const postgresUser = process.env.POSTGRES_USER ?? 'daeho';
const postgresDb = process.env.POSTGRES_DB ?? 'daeho_cms';
const s3PublicBaseUrl = trimTrailingSlash(process.env.CMS_S3_PUBLIC_BASE_URL ?? '');

if (!adminKey) {
  fail('CMS_BACKEND_API_KEY is required in .env.');
}
if (!s3PublicBaseUrl) {
  fail('CMS_S3_PUBLIC_BASE_URL is required in .env.');
}

const stamp = readMigrationStamp();
const backupDir = path.join(root, 'backups', `media-migration-${stamp}`);
const unusedDir = path.join(backupDir, 'unused-public-images');
mkdirSync(backupDir, {recursive: true});

const db = {
  pages: queryJson('SELECT COALESCE(json_agg(row_to_json(t)), \'[]\'::json) FROM (SELECT page_key, content_ko, content_en, seo_ko, seo_en FROM cms_pages ORDER BY page_key) t'),
  news: queryJson('SELECT COALESCE(json_agg(row_to_json(t)), \'[]\'::json) FROM (SELECT * FROM cms_news ORDER BY sort_order, published_at DESC, slug) t'),
  newsTranslations: queryJson('SELECT COALESCE(json_agg(row_to_json(t)), \'[]\'::json) FROM (SELECT * FROM cms_news_translations ORDER BY news_id, locale) t'),
  collections: queryJson('SELECT COALESCE(json_agg(row_to_json(t)), \'[]\'::json) FROM (SELECT * FROM cms_collections ORDER BY sort_order, slug) t'),
  collectionTranslations: queryJson('SELECT COALESCE(json_agg(row_to_json(t)), \'[]\'::json) FROM (SELECT * FROM cms_collection_translations ORDER BY collection_id, locale) t'),
  media: queryJson('SELECT COALESCE(json_agg(row_to_json(t)), \'[]\'::json) FROM (SELECT * FROM cms_media ORDER BY created_at DESC, filename) t')
};

const referenced = collectReferencedImages(db);
const mediaById = new Map(db.media.map((item) => [item.id, item]));
const usedMedia = [];
const unusedMedia = [];

for (const item of db.media) {
  const candidates = mediaCandidates(item);
  if (candidates.some((candidate) => referenced.normalized.has(candidate))) {
    usedMedia.push(item);
  } else {
    unusedMedia.push(item);
  }
}

const localFiles = listPublicImageFiles();
const sourceOnlyUsedFiles = new Set(
  [...referenced.staticFilenames]
    .map((filename) => filename.toLowerCase())
);

const report = {
  apply,
  pruneUnused,
  s3PublicBaseUrl,
  totals: {
    media: db.media.length,
    usedMedia: usedMedia.length,
    unusedMedia: unusedMedia.length,
    publicImageFiles: localFiles.length,
    referencedImages: referenced.normalized.size
  },
  mediaProvidersBefore: countBy(db.media, (item) => item.storage_provider),
  staticReferencedFilenames: [...referenced.staticFilenames].sort(),
  unusedMedia: unusedMedia.map((item) => summarizeMedia(item)),
  missingUsedMediaFiles: usedMedia
    .filter((item) => item.storage_provider !== 's3' && !findLocalMediaFile(item))
    .map((item) => summarizeMedia(item))
};

writeJson(path.join(backupDir, 'media-s3-migration-plan.json'), report);

if (!apply) {
  console.log(JSON.stringify({
    dryRun: true,
    report: path.relative(root, path.join(backupDir, 'media-s3-migration-plan.json')),
    ...report.totals,
    mediaProvidersBefore: report.mediaProvidersBefore,
    missingUsedMediaFiles: report.missingUsedMediaFiles.length
  }, null, 2));
  console.log('Run with --apply --prune-unused to upload referenced CMS media, update DB references, and move unused files into the backup folder.');
  process.exit(0);
}

const migrated = [];
const skipped = [];
const replacementMap = new Map();

for (const item of usedMedia) {
  if (item.storage_provider === 's3') {
    addReplacementCandidates(replacementMap, item, item.url);
    continue;
  }

  const filePath = findLocalMediaFile(item);
  if (!filePath) {
    skipped.push({...summarizeMedia(item), reason: 'missing local file'});
    continue;
  }

  const uploaded = await uploadMediaFile(filePath, item);
  deleteMediaRow(uploaded.id);
  updateMediaRowToS3(item.id, uploaded);
  addReplacementCandidates(replacementMap, item, uploaded.url);
  migrated.push({
    from: summarizeMedia(item),
    to: {
      filename: uploaded.filename,
      path: uploaded.path,
      url: uploaded.url,
      storageProvider: uploaded.storageProvider,
      storageKey: uploaded.storageKey
    }
  });
}

const dbUpdates = replaceDbReferences(db, replacementMap);

let prunedMediaRows = [];
let movedFiles = [];
if (pruneUnused) {
  for (const item of unusedMedia) {
    if (item.storage_provider === 's3') {
      await deleteMediaViaApi(item.id);
    } else {
      deleteMediaRow(item.id);
    }
    prunedMediaRows.push(summarizeMedia(item));
  }

  const keepLocalFilenames = new Set(sourceOnlyUsedFiles);
  for (const filePath of localFiles) {
    const filename = path.basename(filePath);
    if (keepLocalFilenames.has(filename.toLowerCase())) {
      continue;
    }

    if (isReferencedByUnmigratedMedia(filename, mediaById, usedMedia, replacementMap)) {
      continue;
    }

    const target = path.join(unusedDir, filename);
    mkdirSync(path.dirname(target), {recursive: true});
    if (!existsSync(target)) {
      renameSync(filePath, target);
      movedFiles.push({from: path.relative(root, filePath), to: path.relative(root, target)});
    }
  }
}

const result = {
  completedAt: new Date().toISOString(),
  migratedCount: migrated.length,
  skippedCount: skipped.length,
  dbUpdates,
  prunedMediaRows: prunedMediaRows.length,
  movedFiles: movedFiles.length,
  migrated,
  skipped,
  prunedMediaRows,
  movedFiles
};

writeJson(path.join(backupDir, 'media-s3-migration-result.json'), result);

console.log(JSON.stringify({
  applied: true,
  result: path.relative(root, path.join(backupDir, 'media-s3-migration-result.json')),
  migratedCount: result.migratedCount,
  skippedCount: result.skippedCount,
  dbUpdates: result.dbUpdates,
  prunedMediaRows: result.prunedMediaRows,
  movedFiles: result.movedFiles
}, null, 2));

function collectReferencedImages(snapshot) {
  const normalized = new Set();
  const staticFilenames = new Set();

  const add = (value, source) => {
    if (!isImageLike(value)) {
      return;
    }
    for (const candidate of imageCandidatesFromValue(value)) {
      normalized.add(candidate);
      if (source === 'static') {
        staticFilenames.add(path.basename(candidate));
      }
    }
  };

  for (const page of snapshot.pages) {
    collectStrings(page.content_ko, (value) => add(value, 'cms'));
    collectStrings(page.content_en, (value) => add(value, 'cms'));
    collectStrings(page.seo_ko, (value) => add(value, 'cms'));
    collectStrings(page.seo_en, (value) => add(value, 'cms'));
  }

  const visibleNewsIds = new Set(snapshot.news.filter((item) => item.is_visible).map((item) => item.id));
  for (const news of snapshot.news.filter((item) => item.is_visible)) {
    add(news.image_path, 'cms');
  }
  for (const translation of snapshot.newsTranslations.filter((item) => visibleNewsIds.has(item.news_id))) {
    add(translation.og_image_path, 'cms');
    collectStrings(translation.body_json, (value) => add(value, 'cms'));
  }

  const visibleCollectionIds = new Set(snapshot.collections.filter((item) => item.is_visible).map((item) => item.id));
  for (const collection of snapshot.collections.filter((item) => item.is_visible)) {
    add(collection.image_path, 'cms');
    collectStrings(collection.gallery_json, (value) => add(value, 'cms'));
    collectStrings(collection.specs_json, (value) => add(value, 'cms'));
  }
  for (const translation of snapshot.collectionTranslations.filter((item) => visibleCollectionIds.has(item.collection_id))) {
    add(translation.og_image_path, 'cms');
  }

  for (const file of publicSiteSourceFiles()) {
    const text = readFileSync(path.join(root, file), 'utf8');
    for (const value of extractImageStrings(text)) {
      add(value, 'static');
    }
  }

  return {normalized, staticFilenames};
}

function replaceDbReferences(snapshot, replacements) {
  const updates = {
    pages: 0,
    news: 0,
    newsTranslations: 0,
    collections: 0,
    collectionTranslations: 0
  };

  for (const page of snapshot.pages) {
    const next = {
      content_ko: replaceStrings(page.content_ko, replacements),
      content_en: replaceStrings(page.content_en, replacements),
      seo_ko: replaceStrings(page.seo_ko, replacements),
      seo_en: replaceStrings(page.seo_en, replacements)
    };
    if (
      changed(page.content_ko, next.content_ko) ||
      changed(page.content_en, next.content_en) ||
      changed(page.seo_ko, next.seo_ko) ||
      changed(page.seo_en, next.seo_en)
    ) {
      execSql(`
        UPDATE cms_pages
        SET content_ko = ${sqlJson(next.content_ko)}, content_en = ${sqlJson(next.content_en)},
            seo_ko = ${sqlJson(next.seo_ko)}, seo_en = ${sqlJson(next.seo_en)}, updated_at = now()
        WHERE page_key = ${sqlString(page.page_key)};
      `);
      updates.pages += 1;
    }
  }

  for (const news of snapshot.news) {
    const imagePath = replaceImageString(news.image_path, replacements);
    if (imagePath !== news.image_path) {
      execSql(`
        UPDATE cms_news
        SET image_path = ${sqlString(imagePath)}, updated_at = now()
        WHERE id = ${sqlString(news.id)};
      `);
      updates.news += 1;
    }
  }

  for (const translation of snapshot.newsTranslations) {
    const bodyJson = replaceStrings(translation.body_json, replacements);
    const ogImagePath = replaceImageString(translation.og_image_path, replacements);
    if (changed(translation.body_json, bodyJson) || ogImagePath !== translation.og_image_path) {
      execSql(`
        UPDATE cms_news_translations
        SET body_json = ${sqlJson(bodyJson)}, og_image_path = ${sqlString(ogImagePath)}, updated_at = now()
        WHERE news_id = ${sqlString(translation.news_id)} AND locale = ${sqlString(translation.locale)};
      `);
      updates.newsTranslations += 1;
    }
  }

  for (const collection of snapshot.collections) {
    const imagePath = replaceImageString(collection.image_path, replacements);
    const galleryJson = replaceStrings(collection.gallery_json, replacements);
    const specsJson = replaceStrings(collection.specs_json, replacements);
    if (
      imagePath !== collection.image_path ||
      changed(collection.gallery_json, galleryJson) ||
      changed(collection.specs_json, specsJson)
    ) {
      execSql(`
        UPDATE cms_collections
        SET image_path = ${sqlString(imagePath)}, gallery_json = ${sqlJson(galleryJson)}, specs_json = ${sqlJson(specsJson)}, updated_at = now()
        WHERE id = ${sqlString(collection.id)};
      `);
      updates.collections += 1;
    }
  }

  for (const translation of snapshot.collectionTranslations) {
    const ogImagePath = replaceImageString(translation.og_image_path, replacements);
    if (ogImagePath !== translation.og_image_path) {
      execSql(`
        UPDATE cms_collection_translations
        SET og_image_path = ${sqlString(ogImagePath)}, updated_at = now()
        WHERE collection_id = ${sqlString(translation.collection_id)} AND locale = ${sqlString(translation.locale)};
      `);
      updates.collectionTranslations += 1;
    }
  }

  return updates;
}

async function uploadMediaFile(filePath, item) {
  const buffer = readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([buffer], {type: item.mime_type || contentTypeFor(filePath)}), item.filename);
  form.append('filename', item.filename);
  form.append('altKo', item.alt_ko ?? '');
  form.append('altEn', item.alt_en ?? '');

  const response = await fetch(`${localBaseUrl}/api/admin/media`, {
    method: 'POST',
    headers: {'x-admin-api-key': adminKey},
    body: form
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Upload failed for ${item.filename}: HTTP ${response.status} ${body.slice(0, 300)}`);
  }

  return JSON.parse(body).item;
}

async function deleteMediaViaApi(id) {
  const response = await fetch(`${localBaseUrl}/api/admin/media/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {'x-admin-api-key': adminKey}
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Delete failed for media ${id}: HTTP ${response.status} ${body.slice(0, 300)}`);
  }
}

function updateMediaRowToS3(id, uploaded) {
  execSql(`
    UPDATE cms_media
    SET filename = ${sqlString(uploaded.filename)},
        path = ${sqlString(uploaded.path)},
        url = ${sqlString(uploaded.url)},
        mime_type = ${sqlString(uploaded.mimeType ?? '')},
        size_bytes = ${Number(uploaded.sizeBytes) || 0},
        storage_provider = 's3',
        storage_key = ${sqlString(uploaded.storageKey)},
        updated_at = now()
    WHERE id = ${sqlString(id)};
  `);
}

function deleteMediaRow(id) {
  execSql(`DELETE FROM cms_media WHERE id = ${sqlString(id)};`);
}

function isReferencedByUnmigratedMedia(filename, mediaById, used, replacements) {
  const lower = filename.toLowerCase();
  return used.some((item) => {
    if (item.storage_provider === 's3') {
      return false;
    }
    if (replacements.has(normalizeImageRef(item.filename))) {
      return false;
    }
    return mediaCandidates(mediaById.get(item.id) ?? item).some((candidate) => path.basename(candidate).toLowerCase() === lower);
  });
}

function findLocalMediaFile(item) {
  const candidates = [
    item.path,
    item.url,
    item.storage_key,
    item.filename
  ].flatMap((value) => {
    const normalized = [...imageCandidatesFromValue(value)];
    return normalized.map((candidate) => path.join(root, 'public', 'images', path.basename(candidate)));
  });

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return '';
}

function listPublicImageFiles() {
  const output = spawnSync('find', ['public/images', '-maxdepth', '1', '-type', 'f'], {cwd: root, encoding: 'utf8'});
  if (output.status !== 0) {
    fail(output.stderr || 'Unable to list public/images.');
  }
  return output.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((file) => path.join(root, file))
    .filter((file) => imageExtensions.has(path.extname(file).toLowerCase()));
}

function publicSiteSourceFiles() {
  const output = spawnSync('git', ['ls-files'], {cwd: root, encoding: 'utf8'});
  if (output.status !== 0) {
    fail(output.stderr || 'Unable to list tracked files.');
  }
  return output.stdout
    .split('\n')
    .filter(Boolean)
    .filter((file) => {
      if (file.startsWith('app/admin/') || file.startsWith('app/api/') || file.startsWith('backend/') || file.startsWith('scripts/')) {
        return false;
      }
      if (file.includes('.test.') || file.startsWith('projectdoc/') || file.startsWith('artifacts/') || file.startsWith('backups/')) {
        return false;
      }
      return /\.(tsx?|jsx?|json|css|mjs|md)$/.test(file) && (
        file.startsWith('app/') ||
        file.startsWith('components/') ||
        file.startsWith('messages/') ||
        file.startsWith('lib/')
      );
    });
}

function extractImageStrings(text) {
  const results = new Set();
  const patterns = [
    /(?:\/images\/|images\/|\/uploads\/|uploads\/|public\/images\/)[^"'`\s)}]+\.(?:png|jpe?g|webp|gif|avif)/gi,
    /[A-Za-z0-9._@%+-]+\.(?:png|jpe?g|webp|gif|avif)/gi,
    /https?:\/\/[^"'`\s)}]+\.(?:png|jpe?g|webp|gif|avif)/gi
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      results.add(match[0]);
    }
  }
  return [...results];
}

function collectStrings(value, visit) {
  if (typeof value === 'string') {
    visit(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, visit);
    }
    return;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectStrings(item, visit);
    }
  }
}

function replaceStrings(value, replacements) {
  if (typeof value === 'string') {
    return replaceImageString(value, replacements);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceStrings(item, replacements));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceStrings(item, replacements)]));
  }
  return value;
}

function replaceImageString(value, replacements) {
  if (!isImageLike(value)) {
    return value;
  }
  for (const candidate of imageCandidatesFromValue(value)) {
    if (replacements.has(candidate)) {
      return replacements.get(candidate);
    }
  }
  return value;
}

function addReplacementCandidates(map, item, url) {
  for (const candidate of mediaCandidates(item)) {
    map.set(candidate, url);
  }
}

function mediaCandidates(item) {
  return [
    item.filename,
    item.path,
    item.url,
    item.storage_key,
    `/images/${item.filename}`,
    `images/${item.filename}`,
    `/uploads/${item.storage_key || item.filename}`,
    `uploads/${item.storage_key || item.filename}`,
    `public/images/${item.filename}`
  ].flatMap((value) => [...imageCandidatesFromValue(value)]);
}

function imageCandidatesFromValue(value) {
  const normalized = normalizeImageRef(value);
  if (!normalized) {
    return [];
  }
  const set = new Set([normalized]);
  set.add(path.basename(normalized));
  return [...set].filter(Boolean);
}

function normalizeImageRef(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  let target = text.split('#')[0].split('?')[0];
  if (/^https?:\/\//i.test(target)) {
    try {
      target = new URL(target).pathname;
    } catch {
      return text.toLowerCase();
    }
  }

  target = target
    .replace(/^public\/images\//, '')
    .replace(/^\/images\//, '')
    .replace(/^images\//, '')
    .replace(/^\/uploads\//, '')
    .replace(/^uploads\//, '')
    .replace(/^\/+/, '');

  if (!isImageLike(target)) {
    return '';
  }

  return target.toLowerCase();
}

function isImageLike(value) {
  const text = String(value ?? '').trim().split('#')[0].split('?')[0];
  return imageExtensions.has(path.extname(text).toLowerCase());
}

function contentTypeFor(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.avif':
      return 'image/avif';
    default:
      return 'image/png';
  }
}

function queryJson(sql) {
  return JSON.parse(psql(['-A', '-t', '-c', sql]).stdout.trim() || '[]');
}

function execSql(sql) {
  psql(['-v', 'ON_ERROR_STOP=1'], sql);
}

function psql(args, input = '') {
  const result = spawnSync(
    'docker',
    ['exec', '-i', 'daeho-local-postgres-1', 'psql', '-U', postgresUser, '-d', postgresDb, ...args],
    {cwd: root, input, encoding: 'utf8', maxBuffer: 1024 * 1024 * 50}
  );
  if (result.status !== 0) {
    fail(result.stderr || result.stdout || 'psql failed.');
  }
  return result;
}

function sqlString(value) {
  return `'${String(value ?? '').replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function changed(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

function summarizeMedia(item) {
  return {
    id: item.id,
    filename: item.filename,
    path: item.path,
    url: item.url,
    storageProvider: item.storage_provider,
    storageKey: item.storage_key
  };
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item) || '(empty)';
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }
  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function readMigrationStamp() {
  const stampFile = '/tmp/daeho-media-migration-stamp';
  if (existsSync(stampFile)) {
    return readFileSync(stampFile, 'utf8').trim();
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(stampFile, stamp, 'utf8');
  return stamp;
}

function trimTrailingSlash(value) {
  return value.trim().replace(/\/+$/, '');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
