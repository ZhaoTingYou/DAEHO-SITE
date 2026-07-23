declare module '@/lib/analytics-core.mjs' {
  export type AnalyticsConsent = 'unknown' | 'granted' | 'denied';
  export type AnalyticsEventName =
    | 'generate_lead'
    | 'contact_cta_click'
    | 'golf_inquiry_cta_click'
    | 'phone_click'
    | 'email_click'
    | 'social_outbound_click';

  export const ANALYTICS_CONSENT_COOKIE: string;
  export const ANALYTICS_CONSENT_EVENT: string;

  export function sanitizeAnalyticsUrl(input: string | URL): {pagePath: string; pageLocation: string};
  export function parseAnalyticsConsent(cookieHeader: string): AnalyticsConsent;
  export function serializeAnalyticsConsent(choice: Exclude<AnalyticsConsent, 'unknown'>, secure: boolean): string;
  export function sanitizeAnalyticsEvent(
    name: AnalyticsEventName,
    inputParameters?: Record<string, unknown>
  ): {name: AnalyticsEventName; parameters: Record<string, string>} | null;
  export function classifyAnalyticsLink(
    href: string,
    currentOrigin: string
  ): {name: AnalyticsEventName; destination: string; platform?: string} | null;
}
