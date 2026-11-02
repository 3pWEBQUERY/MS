import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: { default: "Verwaltung", template: "%s · Verwaltung" },
  robots: { index: false, follow: false },
};

/**
 * Separater geschützter Bereich mit verpflichtender MFA (PRD 05, ACC05).
 * Das Layout ist kein Zugriffsschutz: jede Seite ruft requireStaff([...]) selbst auf.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
