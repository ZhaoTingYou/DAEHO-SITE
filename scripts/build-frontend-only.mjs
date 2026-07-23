import {existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root = process.cwd();
const backupRoot = path.join(root, '.frontend-only-build-backup');
const disabledPaths = [
  'proxy.ts',
  'app/admin',
  'app/api',
  'app/images',
  'app/uploads'
];
const forceDynamicFiles = [
  'app/sitemap.ts',
  'app/rss.xml/route.ts',
  'app/[locale]/(site)/page.tsx',
  'app/[locale]/(site)/mastery/creations/page.tsx',
  'app/[locale]/(site)/mastery/creations/[slug]/page.tsx',
  'app/[locale]/(site)/mastery/creations/appointment/page.tsx',
  'app/[locale]/(site)/mastery/creations/bespoke/page.tsx',
  'app/[locale]/(site)/mastery/creations/champion/page.tsx',
  'app/[locale]/(site)/news/page.tsx',
  'app/[locale]/(site)/news/[slug]/page.tsx'
];
const staticPreviewPatches = [
  {
    file: 'app/robots.ts',
    replacements: [
      [
        "import type {MetadataRoute} from 'next';\n",
        "import type {MetadataRoute} from 'next';\n\nexport const dynamic = 'force-static';\n"
      ]
    ]
  },
  {
    file: 'app/[locale]/(site)/contact/page.tsx',
    replacements: [
      [
        'export default async function ContactPage({params, searchParams}: Props) {',
        'export default async function ContactPage({params}: Props) {'
      ],
      ['  const query = await searchParams;\n', '  const query = {} as {type?: string};\n']
    ]
  },
  {
    file: 'app/[locale]/(site)/golf/inquiry/page.tsx',
    replacements: [
      [
        'export default async function GolfInquiryPage({params, searchParams}: Props) {',
        'export default async function GolfInquiryPage({params}: Props) {'
      ],
      [
        '  const query = await searchParams;\n',
        '  const query = {} as {head?: string; shaft?: string; style?: string; engraving?: string};\n'
      ]
    ]
  }
];

const originalFiles = new Map();

try {
  prepareBackupRoot();
  disableBackendRoutes();
  stripForceDynamicMarkers();
  applyStaticPreviewPatches();

  const result = spawnSync('npx', ['next', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      CMS_PREVIEW_STATIC: 'true',
      PREVIEW_NOINDEX: 'true',
      DAEHO_FRONTEND_ONLY: 'true'
    }
  });

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  }
} finally {
  restoreFiles();
  restoreBackendRoutes();
}

function prepareBackupRoot() {
  rmSync(backupRoot, {recursive: true, force: true});
  mkdirSync(backupRoot, {recursive: true});
}

function disableBackendRoutes() {
  for (const relativePath of disabledPaths) {
    const source = path.join(root, relativePath);

    if (!existsSync(source)) {
      continue;
    }

    const destination = path.join(backupRoot, encodePath(relativePath));
    mkdirSync(path.dirname(destination), {recursive: true});
    renameSync(source, destination);
  }
}

function stripForceDynamicMarkers() {
  for (const relativePath of forceDynamicFiles) {
    const filePath = path.join(root, relativePath);

    if (!existsSync(filePath)) {
      continue;
    }

    const source = readFileSync(filePath, 'utf8');
    originalFiles.set(filePath, source);
    const nextSource = relativePath === 'app/sitemap.ts' ||
      relativePath === 'app/rss.xml/route.ts'
      ? source.replace("export const dynamic = 'force-dynamic';", "export const dynamic = 'force-static';")
      : source.replace(/\nexport const dynamic = 'force-dynamic';\n/g, '\n');

    writeFileSync(filePath, nextSource, 'utf8');
  }
}

function applyStaticPreviewPatches() {
  for (const patch of staticPreviewPatches) {
    const filePath = path.join(root, patch.file);

    if (!existsSync(filePath)) {
      continue;
    }

    let source = originalFiles.get(filePath) ?? readFileSync(filePath, 'utf8');
    originalFiles.set(filePath, source);

    for (const [from, to] of patch.replacements) {
      source = source.replace(from, to);
    }

    writeFileSync(filePath, source, 'utf8');
  }
}

function restoreFiles() {
  for (const [filePath, source] of originalFiles) {
    writeFileSync(filePath, source, 'utf8');
  }
}

function restoreBackendRoutes() {
  for (const relativePath of [...disabledPaths].reverse()) {
    const source = path.join(backupRoot, encodePath(relativePath));
    const destination = path.join(root, relativePath);

    if (!existsSync(source)) {
      continue;
    }

    mkdirSync(path.dirname(destination), {recursive: true});
    rmSync(destination, {recursive: true, force: true});
    renameSync(source, destination);
  }

  rmSync(backupRoot, {recursive: true, force: true});
}

function encodePath(value) {
  return value.replaceAll('/', '__');
}
