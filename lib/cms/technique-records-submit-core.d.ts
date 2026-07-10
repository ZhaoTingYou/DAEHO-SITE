declare module '@/lib/cms/technique-records-submit-core.mjs' {
  import type {TechniqueLocaleRecord} from '@/lib/cms/technique-records-core.mjs';

  export type TechniqueRecordSubmitInput = {
    koItems: readonly TechniqueLocaleRecord[];
    enItems: readonly TechniqueLocaleRecord[];
    submittedIds: unknown;
    submittedLength: unknown;
  };

  export function normalizeSubmittedTechniqueRecords(
    input: TechniqueRecordSubmitInput
  ): {
    ko: TechniqueLocaleRecord[];
    en: TechniqueLocaleRecord[];
  };
}
