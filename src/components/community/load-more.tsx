import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/** Endliche Seiten mit «Mehr laden» als Link – kein Endlos-Scroll (COM01, PRD 12). */
export function LoadMore({ href, label = "Mehr laden" }: { href: string | null; label?: string }) {
  if (!href) return null;
  return (
    <div className="flex justify-center pt-2">
      <ButtonLink href={href} variant="secondary" icon={<Icon name="chevron-down" className="size-5" />}>
        {label}
      </ButtonLink>
    </div>
  );
}

/** Baut eine URL mit geänderten Suchparametern (leere Werte werden entfernt). */
export function withParams(path: string, params: Record<string, string | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const q = sp.toString();
  return q ? `${path}?${q}` : path;
}
