import Image from 'next/image';

export default function Loading() {
  return (
    <main className="grid min-h-[100svh] place-items-center bg-bg px-[var(--mobile-page-gutter)] text-primary md:min-h-dvh md:px-container">
      <div className="space-y-5 text-center">
        <Image
          src="/images/logo.png"
          alt="DAEHO"
          width={381}
          height={339}
          priority
          className="mx-auto h-auto w-[clamp(72px,8vw,108px)]"
        />
        <div className="mx-auto h-px w-32 overflow-hidden bg-hairline">
          <div className="h-full w-16 animate-[news-rule-draw_1.2s_ease-in-out_infinite] bg-accent" />
        </div>
      </div>
    </main>
  );
}
