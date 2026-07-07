type Swatch = {
  name: string;
  value: string;
  className: string;
};

const swatches: Swatch[] = [
  {name: 'bg', value: '#FFFFFF', className: 'bg-bg'},
  {name: 'white', value: '#FFFFFF', className: 'bg-white'},
  {name: 'primary', value: '#101D30', className: 'bg-primary'},
  {name: 'accent', value: '#7A2230', className: 'bg-accent'}
];

export function ColorSwatchRow() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {swatches.map((swatch) => (
          <div key={swatch.name} className="border border-hairline bg-white p-4">
            <div className={`mb-4 aspect-[4/3] border border-hairline ${swatch.className}`} />
            <p className="font-body text-sm font-semibold uppercase tracking-[0.12em] text-primary">
              {swatch.name}
            </p>
            <p className="mt-1 font-numeric text-sm text-subtext">{swatch.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 border border-hairline bg-white p-6 md:grid-cols-3">
        <div>
          <p className="font-body text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            text
          </p>
          <p className="mt-2 font-body text-body text-text">#1A1A1A as body copy only</p>
        </div>
        <div>
          <p className="font-body text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            subtext
          </p>
          <p className="mt-2 font-body text-base text-subtext">#666666 for secondary copy</p>
        </div>
        <div>
          <p className="font-body text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            hairline
          </p>
          <p className="mt-2 border-t border-hairline pt-4 font-body text-base text-subtext">
            rgba(16, 29, 48, .14)
          </p>
        </div>
      </div>
    </div>
  );
}
