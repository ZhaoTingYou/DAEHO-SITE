import {BackToTopButton} from './back-to-top-button';
import {KakaoContactButton, type KakaoContactCopy} from './kakao-contact-button';

type SiteFloatingActionsProps = {
  backToTopLabel: string;
  kakaoCopy: KakaoContactCopy;
};

export function SiteFloatingActions({backToTopLabel, kakaoCopy}: SiteFloatingActionsProps) {
  return (
    <div
      data-site-floating-actions
      className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[90] flex w-[calc(100vw-2rem)] max-w-[15.5rem] flex-col items-end gap-3 transition-opacity duration-200 motion-reduce:transition-none md:bottom-8 md:right-8"
    >
      <BackToTopButton label={backToTopLabel} />
      <KakaoContactButton copy={kakaoCopy} />
    </div>
  );
}
