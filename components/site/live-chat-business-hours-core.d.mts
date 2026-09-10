export type LiveChatBusinessHours = {
  start: string;
  end: string;
  timeZone: string;
};

export function isWithinLiveChatBusinessHours(
  hours: LiveChatBusinessHours,
  instant?: Date
): boolean;

export function formatLiveChatBusinessHours(hours: LiveChatBusinessHours): string;
