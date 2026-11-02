import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/primitives";
import { requireViewer } from "@/server/auth/viewer";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Willkommen", robots: { index: false } };

/** S07 Einführung (ACC06, F01): Pseudonym, freiwillige Angaben, Datenschutz kurz erklärt. */
export default function WelcomePage({ searchParams }: PageProps<"/willkommen">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Welcome searchParams={searchParams} />
    </Suspense>
  );
}

async function Welcome({ searchParams }: { searchParams: PageProps<"/willkommen">["searchParams"] }) {
  const viewer = await requireViewer({ allowNoProfile: true });
  if (viewer.onboarded) redirect("/heute");
  const sp = await searchParams;
  const ziel = sp.ziel === "festhalten" || sp.ziel === "austausch" ? sp.ziel : undefined;
  return (
    <div className="mx-auto w-full max-w-2xl">
      <OnboardingForm initialGoal={ziel} />
    </div>
  );
}
