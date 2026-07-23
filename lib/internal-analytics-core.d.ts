declare module '@/lib/internal-analytics-core.mjs' {
  export type TrafficChannel =
    | 'google'
    | 'naver'
    | 'instagram'
    | 'kakao'
    | 'qr'
    | 'social'
    | 'referral'
    | 'direct'
    | 'other';

  export type TrafficAttribution = {
    channel: TrafficChannel;
    source: string;
    medium: string;
    campaign: string;
    content: string;
  };

  export type TrafficDevice = 'desktop' | 'tablet' | 'mobile';

  export type StoredSessionState = {
    sessionId: string;
    lastActivityAt: number;
  };

  export type SessionSeed = {
    sessionId?: string;
  };

  export type SessionResolution = StoredSessionState & {
    isNew: boolean;
  };

  export type TrafficAttributionInput = {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    referrerHost?: string;
  };

  export const INTERNAL_ANALYTICS_STORAGE_KEY: string;
  export const INTERNAL_ANALYTICS_SESSION_TIMEOUT_MS: number;

  export function classifyTrafficSource(input?: TrafficAttributionInput): TrafficAttribution;
  export function sanitizeReferrerHost(referrer: string, siteOrigin: string): string;
  export function classifyDevice(viewportWidth: number, userAgentDataMobile: boolean): TrafficDevice;
  export function resolveSessionState(
    storedState: StoredSessionState | null | undefined,
    nowMs: number,
    seed?: SessionSeed
  ): SessionResolution;
}
