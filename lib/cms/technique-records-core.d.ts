declare module '@/lib/cms/technique-records-core.mjs' {
  export type TechniqueLocaleRecord = {
    id?: string;
    title: string;
    body: string;
    image: string;
  };

  export type TechniqueRecordText = {
    title: string;
    body: string;
  };

  export type TechniqueRecordDraft = {
    id?: string;
    image: string;
    ko: TechniqueRecordText;
    en: TechniqueRecordText;
  };

  export function pairTechniqueRecords(
    koItems: readonly TechniqueLocaleRecord[],
    enItems: readonly TechniqueLocaleRecord[]
  ): TechniqueRecordDraft[];

  export function buildTechniqueRecordLocales(drafts: readonly TechniqueRecordDraft[]): {
    ko: TechniqueLocaleRecord[];
    en: TechniqueLocaleRecord[];
  };

  export const minimumTechniqueCarouselItems: 3;
}
