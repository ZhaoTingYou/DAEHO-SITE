import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';

import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {requireAdmin} from '@/lib/cms/auth';
import {
  maxAdminJsonBodyBytes,
  parseJsonBody,
  rejectOversizedRequest,
  validationError
} from '@/lib/cms/http';
import {createMedia, listMedia} from '@/lib/cms/repositories';
import {
  getImageUploadError,
  maxMultipartImageRequestBytes
} from '@/lib/cms/upload-policy';
import {mediaPayloadSchema} from '@/lib/cms/validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  return NextResponse.json({items: listMedia()});
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const contentType = request.headers.get('content-type') ?? '';

  if (!contentType.includes('multipart/form-data')) {
    const oversized = rejectOversizedRequest(request, maxAdminJsonBodyBytes);

    if (oversized) {
      return oversized;
    }

    const parsed = await parseJsonBody(request, mediaPayloadSchema);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    return NextResponse.json({item: createMedia(parsed.data)}, {status: 201});
  }

  const oversized = rejectOversizedRequest(request, maxMultipartImageRequestBytes);

  if (oversized) {
    return oversized;
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({error: 'A file field is required.'}, {status: 400});
  }

  const uploadError = getImageUploadError(file);

  if (uploadError) {
    return NextResponse.json({error: uploadError}, {status: 400});
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = createPublicFilename(file.name);
  const diskPath = path.join(process.cwd(), 'public', 'images', filename);
  await writeFile(diskPath, bytes);

  const item = createMedia({
    filename,
    path: `public/images/${filename}`,
    url: `/images/${filename}`,
    mimeType: file.type,
    sizeBytes: bytes.length,
    altKo: readFormValue(formData, 'altKo'),
    altEn: readFormValue(formData, 'altEn'),
    storageProvider: 'public',
    storageKey: filename
  });

  return NextResponse.json({item}, {status: 201});
}

function createPublicFilename(originalName: string) {
  const extension = path.extname(originalName).toLowerCase();
  const baseName = path
    .basename(originalName, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  return `${baseName || 'asset'}-${randomUUID().slice(0, 8)}${extension}`;
}

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}
