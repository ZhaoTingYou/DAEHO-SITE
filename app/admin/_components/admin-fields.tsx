export function TextField({
  label,
  name,
  defaultValue,
  type = 'text',
  required = false,
  placeholder
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
      />
    </label>
  );
}

export function TextAreaField({
  label,
  name,
  defaultValue,
  rows = 4,
  required = false,
  placeholder
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
      <span>{label}</span>
      <textarea
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-md border border-[#cbd3df] bg-white px-3 py-2 text-sm leading-6 text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{label: string; value: string}>;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm text-[#101827] outline-none transition focus:border-[#7a2230] focus:ring-2 focus:ring-[#7a2230]/15"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CheckboxField({
  label,
  name,
  defaultChecked
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#344054]">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-[#cbd3df] accent-[#7a2230]"
      />
      <span>{label}</span>
    </label>
  );
}

export function SubmitButton({children = 'Save'}: {children?: React.ReactNode}) {
  return (
    <button className="admin-on-dark min-h-10 rounded-md bg-[#7a2230] px-4 text-sm font-semibold text-[#ffffff] transition hover:bg-[#101827] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2230]">
      {children}
    </button>
  );
}

export function SecondaryLink({href, children}: {href: string; children: React.ReactNode}) {
  return (
    <a
      href={href}
      className="inline-flex min-h-10 items-center rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f4f5f7]"
    >
      {children}
    </a>
  );
}

export function DangerButton({children}: {children: React.ReactNode}) {
  return (
    <button className="min-h-9 rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-3 text-sm font-semibold text-[#b42318] transition hover:bg-[#fee4e2]">
      {children}
    </button>
  );
}
