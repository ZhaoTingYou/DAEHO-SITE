declare module '@/lib/cms/admin-api-client.mjs' {
  export function fetchAdminApi(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response>;
}
