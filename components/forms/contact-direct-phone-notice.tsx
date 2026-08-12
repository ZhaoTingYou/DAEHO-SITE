export type ContactDirectPhoneNoticeCopy = {
  before: string;
  phone: string;
  after: string;
};

type ContactDirectPhoneNoticeProps = {
  copy: ContactDirectPhoneNoticeCopy;
};

export function ContactDirectPhoneNotice({copy}: ContactDirectPhoneNoticeProps) {
  const hasContent = Boolean(copy.before || copy.phone || copy.after);

  if (!hasContent) {
    return null;
  }

  return (
    <p className="font-body text-[16px] font-normal leading-7 text-text md:text-[14px] md:leading-6">
      {copy.before}
      {copy.before && copy.phone ? ' ' : null}
      {copy.phone ? <span className="text-accent whitespace-nowrap">{copy.phone}</span> : null}
      {copy.after}
    </p>
  );
}
