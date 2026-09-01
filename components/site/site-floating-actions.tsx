import {BackToTopButton} from './back-to-top-button';
import type {Locale} from '@/lib/locales';

import {
  WebLiveChatWidget,
  type WebLiveChatCopy
} from './web-live-chat-widget';

type SiteFloatingActionsProps = {
  backToTopLabel: string;
  locale: Locale;
  liveChatCopy: WebLiveChatCopy;
  liveChatConfig: {enabled: boolean};
};

export function SiteFloatingActions({
  backToTopLabel,
  locale,
  liveChatCopy,
  liveChatConfig
}: SiteFloatingActionsProps) {
  return (
    <div
      data-site-floating-actions
      className="pointer-events-none fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-[90] flex flex-col items-end transition-opacity duration-200 motion-reduce:transition-none md:bottom-28 md:right-8"
    >
      <BackToTopButton label={backToTopLabel} />
      <WebLiveChatWidget
        copy={liveChatCopy}
        locale={locale}
        enabled={liveChatConfig.enabled}
      />
    </div>
  );
}
