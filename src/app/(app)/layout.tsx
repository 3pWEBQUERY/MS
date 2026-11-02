import { AppShell } from "@/components/shell/app-shell";

/** Geschützter Mitgliederbereich. Jede Seite prüft Berechtigungen selbst (Layout-Schutz genügt nicht, PRD 14). */
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
