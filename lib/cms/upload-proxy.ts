import 'server-only';

import {readFile} from 'node:fs/promises';
import path from 'node:path';

import {getCmsBackendBaseUrl} from './repositories';

type UploadProxyOptions = {
  publicImagesFallback?: boolean;
  publicUploadsFallback?: boolean;
};

const immutableImageCache = 'public, max-age=31536000, immutable';

export async function getUploadAssetResponse(
  segments: string[],
  options: UploadProxyOptions = {}
) {
  const assetPath = safeAssetPath(segments);

  if (!assetPath) {
    return Response.json({error: 'Invalid asset path'}, {status: 400});
  }

  if (options.publicImagesFallback) {
    const localResponse = await readPublicImage(assetPath);

    if (localResponse) {
      return localResponse;
    }
  }

  if (options.publicUploadsFallback) {
    const localResponse = await readPublicUpload(assetPath);

    if (localResponse) {
      return localResponse;
    }
  }

  const backendUrl = `${getCmsBackendBaseUrl()}/uploads/${assetPath
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
  const response = await fetch(backendUrl, {cache: 'no-store'});

  if (!response.ok || !response.body) {
    return Response.json({error: 'Asset not found'}, {status: 404});
  }

  const headers = new Headers();
  headers.set('Cache-Control', immutableImageCache);
  headers.set('Content-Type', response.headers.get('content-type') || contentTypeFor(assetPath));
  const contentLength = response.headers.get('content-length');

  if (contentLength) {
    headers.set('Content-Length', contentLength);
  }

  return new Response(response.body, {
    status: response.status,
    headers
  });
}

async function readPublicUpload(assetPath: string) {
  return readPublicAsset(path.resolve(process.cwd(), 'public', 'uploads'), assetPath);
}

async function readPublicImage(assetPath: string) {
  return readPublicAsset(path.resolve(process.cwd(), 'public', 'images'), assetPath);
}

async function readPublicAsset(root: string, assetPath: string) {
  const filePath = path.resolve(root, assetPath);

  if (!filePath.startsWith(`${root}${path.sep}`)) {
    return null;
  }

  try {
    const bytes = await readFile(filePath);
    return new Response(bytes, {
      headers: {
        'Cache-Control': immutableImageCache,
        'Content-Type': contentTypeFor(assetPath)
      }
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

function safeAssetPath(segments: string[]) {
  const joined = segments.join('/').replace(/\\/g, '/');
  const normalized = path.posix.normalize(joined).replace(/^\/+/, '');

  if (!normalized || normalized === '.' || normalized.startsWith('../')) {
    return '';
  }

  return normalized;
}

function contentTypeFor(filename: string) {
  const extension = path.extname(filename).toLowerCase();

  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }
  if (extension === '.png') {
    return 'image/png';
  }
  if (extension === '.webp') {
    return 'image/webp';
  }
  if (extension === '.gif') {
    return 'image/gif';
  }

  return 'application/octet-stream';
}
