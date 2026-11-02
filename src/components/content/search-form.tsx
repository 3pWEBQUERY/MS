import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Suchfeld als einfaches GET-Formular (funktioniert ohne JavaScript). Suchbegriffe werden nicht
 * in Analytics übernommen (CON07).
 */
export function SearchForm({
  defaultValue,
  scope,
  label = "Suchbegriff",
  placeholder = "z. B. Fatigue, Arbeit, IV",
  id = "suche",
}: {
  defaultValue?: string;
  scope?: string;
  label?: string;
  placeholder?: string;
  id?: string;
}) {
  return (
    <form action="/suche" method="get" role="search" className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-semibold text-ink">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-2" />
          <input
            id={id}
            name="q"
            type="search"
            defaultValue={defaultValue}
            placeholder={placeholder}
            maxLength={120}
            autoComplete="off"
            enterKeyHint="search"
            className="h-12 w-full rounded-[12px] border border-field bg-surface pl-12 pr-4 text-base text-ink placeholder:text-ink-3 transition-colors duration-150 hover:border-ink-2 focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-1"
          />
        </div>
        {scope && <input type="hidden" name="bereich" value={scope} />}
        <button type="submit" className={buttonClass("primary", "md")}>
          Suchen
        </button>
      </div>
    </form>
  );
}
