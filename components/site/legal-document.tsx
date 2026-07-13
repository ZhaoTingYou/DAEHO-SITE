type LegalSection = {
  heading: string;
  body: string[];
};

export type LegalDocumentContent = {
  eyebrow: string;
  title: string;
  effective?: string;
  notice?: string;
  intro?: string;
  sections: LegalSection[];
};

export function LegalDocument({content}: {content: LegalDocumentContent}) {
  return (
    <main className="mobile-page-shell bg-bg text-text">
      <section className="pt-[calc(var(--mobile-header-height)+env(safe-area-inset-top)+32px)] md:pt-28">
        <div className="mx-auto max-w-[820px] px-[var(--mobile-page-gutter)] pb-[var(--mobile-section-space)] pt-12 md:px-container md:pb-section md:pt-[clamp(48px,7vw,104px)]">
          <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.26em] text-subtext">
            {content.eyebrow}
          </p>
          <h1 className="overflow-wrap-anywhere mt-4 font-heading text-[40px] font-semibold leading-[1.12] text-primary [overflow-wrap:anywhere] md:text-[clamp(28px,3.4vw,42px)]">
            {content.title}
          </h1>
          {content.effective ? (
            <p className="mt-3 break-words font-body text-[16px] font-semibold leading-6 text-subtext md:text-[12px] md:uppercase md:tracking-[0.12em]">
              {content.effective}
            </p>
          ) : null}

          {content.notice ? (
            <p className="mobile-copy overflow-wrap-anywhere mt-8 whitespace-pre-line border-l-2 border-accent bg-white px-4 py-4 font-body text-subtext [overflow-wrap:anywhere] [word-break:keep-all] md:px-5 md:text-[13px] md:leading-7">
              {content.notice}
            </p>
          ) : null}

          {content.intro ? (
            <p className="mobile-copy overflow-wrap-anywhere mt-10 whitespace-pre-line font-body text-text [overflow-wrap:anywhere] [word-break:keep-all] md:text-[14px] md:leading-[1.9]">
              {content.intro}
            </p>
          ) : null}

          <div className={`${content.notice || content.intro ? 'mt-12' : 'mt-10'} space-y-12 md:space-y-10`}>
            {content.sections.map((section) => (
              <section key={section.heading} className="space-y-3">
                <h2 className="overflow-wrap-anywhere font-heading text-[20px] font-semibold leading-snug text-primary [overflow-wrap:anywhere] md:text-[clamp(17px,1.6vw,21px)]">
                  {section.heading}
                </h2>
                <div className="space-y-2">
                  {section.body.map((line, index) => (
                    <p
                      key={index}
                      className="mobile-copy overflow-wrap-anywhere whitespace-pre-line font-body text-text [overflow-wrap:anywhere] [word-break:keep-all] md:text-[14px] md:leading-[1.9]"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
