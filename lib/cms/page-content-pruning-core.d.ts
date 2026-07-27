declare module '@/lib/cms/page-content-pruning-core.mjs' {
  export function pruneObjectPaths(
    content: Record<string, unknown>,
    paths: readonly string[]
  ): Record<string, unknown>;
}
