export type AchievementFirstRecordsMessages = {
  legacyPages: {
    achievement: {
      copy: {
        firstRecords?: unknown;
      };
    };
  };
};

export type AchievementFirstRecordInput = {
  frontTitle?: string;
  title?: string;
  image?: string;
};

export type AchievementFirstRecord = {
  title: string;
  image: string;
};

export function normalizeAchievementFirstRecords(
  records: AchievementFirstRecordInput[] | undefined
): AchievementFirstRecord[] {
  if (!Array.isArray(records)) {
    return [];
  }

  return records.slice(0, 4).map((record) => {
    const title = record.frontTitle !== undefined ? record.frontTitle : record.title;

    return {
      title: title?.trim() || '',
      image: record.image?.trim() || ''
    };
  });
}

function hasRecordWithImage(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.some((record) => {
    if (!record || typeof record !== 'object') {
      return false;
    }

    const image = (record as Record<string, unknown>).image;
    return typeof image === 'string' && image.trim().length > 0;
  });
}

function cloneJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneJsonValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneJsonValue(item)])
    );
  }

  return value;
}

export function normalizeAchievementFirstRecordsFallback<T extends AchievementFirstRecordsMessages>(
  messages: T,
  staticMessages: AchievementFirstRecordsMessages
): T {
  const configuredRecords = messages.legacyPages.achievement.copy.firstRecords;

  if (hasRecordWithImage(configuredRecords)) {
    return messages;
  }

  const staticRecords = staticMessages.legacyPages.achievement.copy.firstRecords;
  messages.legacyPages.achievement.copy.firstRecords = Array.isArray(staticRecords)
    ? cloneJsonValue(staticRecords)
    : [];

  return messages;
}
