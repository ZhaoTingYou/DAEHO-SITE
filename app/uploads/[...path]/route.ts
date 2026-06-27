import {getUploadAssetResponse} from '@/lib/cms/upload-proxy';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{path: string[]}>;
};

export async function GET(_request: Request, context: RouteContext) {
  const {path} = await context.params;
  return getUploadAssetResponse(path);
}
