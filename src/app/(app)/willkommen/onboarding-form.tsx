"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MemberProfileCard } from "@/components/account/profile-card";
import { WhoSeesWhat } from "@/components/account/who-sees-what";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, RadioCards, Select, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/primitives";
import { idle } from "@/lib/action-state";
import { CANTONS, INTERESTS, ONBOARDING_GOALS } from "@/lib/catalog";
import { checkPseudonymAction, completeOnboardingAction } from "@/server/modules/account/profile-actions";
import { useResilientAction } from "@/components/ui/use-resilient-action";

const STEPS = [
  { title: "Wie möchtest du in der Community heissen?", eyebrow: "Pseudonym" },
  { title: "Was interessiert dich?", eyebrow: "Freiwillige Angaben" },
  { title: "Was möchtest du zuerst tun?", eyebrow: "Freiwilliges Ziel" },
  { title: "Wer sieht was", eyebrow: "Datenschutz kurz erklärt" },
] as const;

/**
 * S07 (ACC06): ruhig und mehrstufig, je Schritt genau eine Hauptaktion.
 * Alle Eingaben bleiben in einem Formular erhalten; Optionales lässt sich leer lassen.
 */
export function OnboardingForm({ initialGoal }: { initialGoal?: string }) {
  const [state, action] = useResilientAction(completeOnboardingAction);
  const [step, setStep] = useState(0);
  const [pseudonym, setPseudonym] = useState(String(state.values?.pseudonym ?? ""));
  const [interests, setInterests] = useState<string[]>([]);
  const [canton, setCanton] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [checking, startCheck] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // Fokus auf den Schrittitel, damit Screenreader den Wechsel ankündigen (A03, A04)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  // Serverseitiger Fehler beim Pseudonym (z. B. inzwischen vergeben): zurück zu Schritt 1
  const serverNameError = state.fieldErrors?.pseudonym;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (serverNameError) setStep(0);
  }, [serverNameError, state]);

  function next() {
    if (step === 0) {
      const value = pseudonym.trim();
      if (value.length < 2) {
        setNameError("Bitte wähle ein Pseudonym mit mindestens 2 Zeichen.");
        return;
      }
      startCheck(async () => {
        const res = await checkPseudonymAction(value);
        if (res.ok) {
          setNameError(undefined);
          setStep(1);
        } else setNameError(res.message);
      });
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  const current = STEPS[step];
  const shownNameError = nameError ?? (step === 0 ? serverNameError : undefined);

  return (
    <form
      action={action}
      noValidate
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        // Enter in einem frühen Schritt führt weiter statt abzuschliessen
        if (step < STEPS.length - 1) {
          e.preventDefault();
          next();
        }
      }}
    >
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-2">
          Schritt {step + 1} von {STEPS.length} · {current.eyebrow}
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl font-[650] tracking-[-0.025em] text-ink outline-none sm:text-[2.5rem] sm:leading-[1.08]"
        >
          {current.title}
        </h1>
        <div className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.title} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-ink" : "bg-sunk"}`} />
          ))}
        </div>
      </header>

      <FormMessage state={state.status === "error" && !serverNameError ? state : idle} />

      {/* Schritt 1: Pseudonym */}
      <section hidden={step !== 0} className="flex flex-col gap-6">
        <p className="text-lg text-ink-2">
          Andere Mitglieder sehen nur dieses Pseudonym – nicht deinen Namen und nie deine E-Mail-Adresse. Du kannst es
          später im Profil ändern.
        </p>
        <Field
          label="Pseudonym"
          required
          hint="2 bis 40 Zeichen. Bitte keine Begriffe, die eine Fach- oder Plattformrolle andeuten, z. B. «Dr», «Ärztin», «Moderation» oder «Team»."
          error={shownNameError}
        >
          {(p) => (
            <Input
              {...p}
              name="pseudonym"
              autoComplete="nickname"
              maxLength={40}
              value={pseudonym}
              onChange={(e) => {
                setPseudonym(e.target.value);
                setNameError(undefined);
              }}
            />
          )}
        </Field>
      </section>

      {/* Schritt 2: Interessen und Kanton */}
      <section hidden={step !== 1} className="flex flex-col gap-8">
        <p className="text-lg text-ink-2">Alles hier ist freiwillig. Du kannst es leer lassen und später im Profil ergänzen.</p>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-base font-semibold text-ink">
            Interessen <span className="ml-1 text-sm font-normal text-ink-2">(optional, für Mitglieder sichtbar)</span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {INTERESTS.map(([code, label]) => (
              <Checkbox
                key={code}
                name="interests"
                value={code}
                label={label}
                checked={interests.includes(code)}
                onChange={(e) =>
                  setInterests((list) => (e.target.checked ? [...list, code] : list.filter((c) => c !== code)))
                }
              />
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-3">
          <Notice tone="accent" icon="eye" title="Der Kanton ist für Mitglieder sichtbar">
            Wenn du einen Kanton wählst, sehen angemeldete Mitglieder ihn in deinem Profil. Ohne Angabe erscheint nichts.
          </Notice>
          <Field label="Kanton" optional>
            {(p) => (
              <Select {...p} name="canton" value={canton} onChange={(e) => setCanton(e.target.value)}>
                <option value="">Keine Angabe</option>
                {CANTONS.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </section>

      {/* Schritt 3: Nutzungsziel (privat) */}
      <section hidden={step !== 2} className="flex flex-col gap-6">
        <p className="text-lg text-ink-2">
          Damit wir dir einen passenden Einstieg zeigen. Das Ziel ist nur für dich und erscheint nicht im Profil. Alle
          Bereiche bleiben unabhängig davon erreichbar.
        </p>
        <RadioCards
          name="goal"
          legend="Mein erstes Ziel (optional)"
          defaultValue={initialGoal ?? (state.values?.goal as string | undefined)}
          options={ONBOARDING_GOALS.map(([value, label]) => ({
            value,
            label,
            description:
              value === "festhalten"
                ? "Danach kannst du den privaten Gesundheitsbereich bewusst aktivieren – oder es lassen."
                : undefined,
          }))}
        />
      </section>

      {/* Schritt 4: Datenschutz kurz erklärt + Vorschau */}
      <section hidden={step !== 3} className="flex flex-col gap-6">
        <p className="text-lg text-ink-2">
          Du entscheidest, was du teilst. Dein Tagebuch ist ein eigener, privater Bereich und wird erst nach deiner
          ausdrücklichen Aktivierung genutzt.
        </p>
        <WhoSeesWhat compact />
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-[650] text-ink">So sehen dich andere Mitglieder</h2>
          <MemberProfileCard profile={{ pseudonym, interests, canton: canton || null }} />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        {step > 0 ? (
          <Button variant="ghost" icon={<Icon name="arrow-left" className="size-5" />} onClick={() => setStep((s) => s - 1)}>
            Zurück
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button
            variant="primary"
            size="lg"
            onClick={next}
            disabled={checking}
            aria-disabled={checking || undefined}
            iconRight={<Icon name={checking ? "loader" : "arrow-right"} className={checking ? "size-5 motion-safe:animate-spin" : "size-5"} />}
          >
            {checking ? "Wird geprüft …" : step === 1 && interests.length === 0 && !canton ? "Ohne Angaben weiter" : "Weiter"}
          </Button>
        ) : (
          <SubmitButton size="lg" pendingText="Profil wird angelegt …" icon={<Icon name="check" className="size-5" />}>
            Profil anlegen und loslegen
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
