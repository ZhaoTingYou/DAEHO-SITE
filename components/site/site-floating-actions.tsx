import {BackToTopButton} from './back-to-top-button';
import type {Locale} from '@/lib/locales';

import {
  TelegramLiveChatButton,
  type TelegramLiveChatCopy
} from './telegram-live-chat-button';

type SiteFloatingActionsProps = {
  backToTopLabel: string;
  locale: Locale;
  liveChatCopy: TelegramLiveChatCopy;
  liveChatConfig: {enabled: boolean; botUsername: string};
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
      className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[90] flex w-[calc(100vw-2rem)] max-w-[15.5rem] flex-col items-end gap-3 transition-opacity duration-200 motion-reduce:transition-none md:bottom-8 md:right-8"
    >
      <BackToTopButton label={backToTopLabel} />
      <TelegramLiveChatButton
        copy={liveChatCopy}
        locale={locale}
        enabled={liveChatConfig.enabled}
        botUsername={liveChatConfig.botUsername}
      />
    </div>
  );
}
