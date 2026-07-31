import 'server-only';

import {cmsBackendRequest} from './repositories';

export type CmsStatus = {
  checkedAt: string;
  database: {
    path: string;
    url?: string;
    engine?: string;
    productName?: string;
    productVersion?: string;
  };
  environment: {
    persistence: string;
    uploadDir?: string;
    uploadDirExists?: boolean;
    publicUploadBaseUrl?: string;
  };
  security: Record<string, unknown>;
  email: {
    configured: boolean;
    hasSmtpHost: boolean;
    hasSender: boolean;
    hasRecipient: boolean;
    hasSmtpAuth: boolean;
  };
  latest: {
    inquiryCreatedAt: string;
    notificationJobCreatedAt: string;
  };
  tables: Array<{table: string; count: number}>;
};

export async function getCmsStatus(): Promise<CmsStatus> {
  return cmsBackendRequest<CmsStatus>('/api/admin/status', {admin: true});
}
