"use client";

import {
  createContext,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useId,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  ADMIN_CONTENT_LOCALE_STORAGE_KEY,
  contentLocaleForKey,
  normalizeAdminContentLocale,
  type AdminContentLocale,
} from "@/lib/admin-content-locale-core.mjs";

type ContentLocaleContextValue = {
  activeLocale: AdminContentLocale;
  setActiveLocale: (locale: AdminContentLocale) => void;
  baseId: string;
};

type LocaleLabels = Record<AdminContentLocale, string>;

const ContentLocaleContext = createContext<ContentLocaleContextValue | null>(
  null,
);
const localePreferenceListeners = new Set<() => void>();
let volatileLocalePreference: AdminContentLocale = "ko";

function getBrowserLocalePreference(): AdminContentLocale {
  try {
    volatileLocalePreference = normalizeAdminContentLocale(
      window.localStorage.getItem(ADMIN_CONTENT_LOCALE_STORAGE_KEY),
    );
    return volatileLocalePreference;
  } catch {
    return volatileLocalePreference;
  }
}

function subscribeToLocalePreference(listener: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === ADMIN_CONTENT_LOCALE_STORAGE_KEY) {
      listener();
    }
  }

  localePreferenceListeners.add(listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    localePreferenceListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function useContentLocale() {
  const value = useContext(ContentLocaleContext);

  if (!value) {
    throw new Error(
      "Content locale controls must be placed inside ContentLocaleProvider.",
    );
  }

  return value;
}

export function ContentLocaleProvider({ children }: { children: ReactNode }) {
  const baseId = useId();
  const activeLocale: AdminContentLocale = useSyncExternalStore(
    subscribeToLocalePreference,
    getBrowserLocalePreference,
    (): AdminContentLocale => "ko",
  );

  function setActiveLocale(locale: AdminContentLocale) {
    volatileLocalePreference = locale;
    try {
      window.localStorage.setItem(ADMIN_CONTENT_LOCALE_STORAGE_KEY, locale);
    } catch {}
    localePreferenceListeners.forEach((listener) => listener());
  }

  return (
    <ContentLocaleContext.Provider
      value={{ activeLocale, setActiveLocale, baseId }}
    >
      {children}
    </ContentLocaleContext.Provider>
  );
}

export function ContentLocaleSwitcher({
  label,
  labels,
}: {
  label: string;
  labels: LocaleLabels;
}) {
  const { activeLocale, setActiveLocale, baseId } = useContentLocale();
  const koRef = useRef<HTMLButtonElement>(null);
  const enRef = useRef<HTMLButtonElement>(null);
  const tabs = [
    { locale: "ko" as const, shortLabel: "KO", ref: koRef },
    { locale: "en" as const, shortLabel: "EN", ref: enRef },
  ];

  function selectLocale(locale: AdminContentLocale) {
    setActiveLocale(locale);
    (locale === "ko" ? koRef : enRef).current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const nextLocale = contentLocaleForKey(activeLocale, event.key);

    if (!nextLocale) {
      return;
    }

    event.preventDefault();
    selectLocale(nextLocale);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div
        aria-label={label}
        className="inline-flex rounded-md border border-slate-300 bg-slate-50 p-1"
        role="tablist"
      >
        {tabs.map(({ locale, shortLabel, ref }) => {
          const selected = activeLocale === locale;

          return (
            <button
              ref={ref}
              key={locale}
              aria-label={labels[locale]}
              aria-selected={selected}
              className={`min-h-10 min-w-20 rounded px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f2335] ${
                selected
                  ? "bg-[#8f2335] text-white"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
              id={`${baseId}-${locale}-tab`}
              onClick={() => selectLocale(locale)}
              onKeyDown={handleKeyDown}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ContentLocalePanel({
  locale,
  children,
  className = "",
}: {
  locale: AdminContentLocale;
  children: ReactNode;
  className?: string;
}) {
  const { activeLocale, baseId } = useContentLocale();

  return (
    <div
      aria-hidden={activeLocale !== locale}
      className={`min-w-0 max-w-full ${className}`}
      data-content-locale={locale}
      hidden={activeLocale !== locale}
      aria-labelledby={`${baseId}-${locale}-tab`}
      role="tabpanel"
    >
      {children}
    </div>
  );
}

function ContentLocaleFormBody({
  action,
  children,
  className,
  label,
  localeLabels,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  label: string;
  localeLabels: LocaleLabels;
}) {
  const { setActiveLocale } = useContentLocale();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const controls = Array.from(event.currentTarget.elements).filter(
      (
        element,
      ): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement,
    );
    const invalidControl = controls.find((control) => !control.checkValidity());

    if (!invalidControl) {
      return;
    }

    event.preventDefault();
    const localePanel = invalidControl.closest('[data-content-locale]');
    const locale = localePanel?.getAttribute("data-content-locale");

    if (locale === "ko" || locale === "en") {
      setActiveLocale(locale);
    }

    requestAnimationFrame(() => {
      invalidControl.focus();
      invalidControl.reportValidity();
    });
  }

  return (
    <form
      action={action}
      className={className}
      noValidate
      onSubmit={handleSubmit}
    >
      <ContentLocaleSwitcher label={label} labels={localeLabels} />
      {children}
    </form>
  );
}

export function ContentLocaleForm({
  action,
  children,
  className,
  label,
  localeLabels,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  label: string;
  localeLabels: LocaleLabels;
}) {
  return (
    <ContentLocaleProvider>
      <ContentLocaleFormBody
        action={action}
        className={className}
        label={label}
        localeLabels={localeLabels}
      >
        {children}
      </ContentLocaleFormBody>
    </ContentLocaleProvider>
  );
}
