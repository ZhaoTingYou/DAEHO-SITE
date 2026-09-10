const CLOCK_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function minutes(value) {
  if (!CLOCK_PATTERN.test(String(value ?? ''))) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function isWithinLiveChatBusinessHours(hours, instant = new Date()) {
  const start = minutes(hours?.start);
  const end = minutes(hours?.end);
  if (start === null || end === null || start >= end) return false;

  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: hours?.timeZone || 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(instant);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value);
    const current = hour * 60 + minute;
    return Number.isFinite(current) && current >= start && current < end;
  } catch {
    return false;
  }
}

export function formatLiveChatBusinessHours(hours) {
  return `${hours.start}–${hours.end}`;
}
