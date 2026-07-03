import Link from 'next/link';

import {SafeImage} from './safe-image';

export type ProductGridItem = {
  title: string;
  caption: string;
  image: string;
  href: string;
};

export function ProductGrid({items}: {items: ProductGridItem[]}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.title}
          href={item.href}
          className="group block bg-white p-4 shadow-[0_18px_60px_rgba(16,29,48,0.06)] transition duration-hover ease-brand hover:-translate-y-1 hover:shadow-[0_26px_80px_rgba(16,29,48,0.10)]"
        >
          <div className="hover-zoom">
            <div className="hover-zoom-media">
              <SafeImage
                filename={item.image}
                alt={item.caption}
                aspect="aspect-square"
                variant="plain"
              />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <h3 className="font-heading text-xl font-semibold text-primary">{item.title}</h3>
            <p className="whitespace-pre-line font-body text-sm leading-6 text-subtext">{item.caption}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
