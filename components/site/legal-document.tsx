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
    <main className="bg-bg text-text">
      <section className="pt-28">
        <div className="mx-auto max-w-[820px] px-container pb-section pt-[clamp(48px,7vw,104px)]">
          <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.26em] text-subtext">
            {content.eyebrow}
          </p>
          <h1 className="mt-4 font-heading text-[clamp(28px,3.4vw,42px)] font-semibold leading-[1.12] text-primary">
            {content.title}
          </h1>
          {content.effective ? (
            <p className="mt-3 font-body text-[12px] font-semibold uppercase tracking-[0.12em] text-subtext">
              {content.effective}
            </p>
          ) : null}

          {content.notice ? (
            <p className="mt-8 border-l-2 border-accent bg-white px-5 py-4 font-body text-[13px] leading-7 text-subtext [word-break:keep-all]">
              {content.notice}
            </p>
          ) : null}

          {content.intro ? (
            <p className="mt-10 font-body text-[14px] leading-[1.9] text-text [word-break:keep-all]">
              {content.intro}
            </p>
          ) : null}

          <div className={`${content.notice || content.intro ? 'mt-12' : 'mt-10'} space-y-10`}>
            {content.sections.map((section) => (
              <section key={section.heading} className="space-y-3">
                <h2 className="font-heading text-[clamp(17px,1.6vw,21px)] font-semibold leading-snug text-primary">
                  {section.heading}
                </h2>
                <div className="space-y-2">
                  {section.body.map((line, index) => (
                    <p
                      key={index}
                      className="font-body text-[14px] leading-[1.9] text-text [word-break:keep-all]"
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
