"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { applyDisplay, DEFAULT_DISPLAY, readDisplay, type DisplayPrefs } from "@/components/shell/display";
import { Button, buttonClass } from "@/components/ui/button";
import { FormMessage, RadioCards, Switch } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Card, Notice } from "@/components/ui/primitives";
import { idle, type ActionState } from "@/lib/action-state";
import { saveDisplayPrefsAction } from "@/server/modules/account/settings-actions";

/**
 * S13 Anzeige und Bedienung (HOM06): Farbschema, Schriftgrösse, Bewegung und einfache
 * Ansicht mit sofortiger Vorschau. Gäste speichern lokal auf dem Gerät, Mitglieder
 * zusätzlich geräteübergreifend. Systemeinstellungen sind der Ausgangspunkt («System»).
 */
export function DisplaySettings({ mode, initial }: { mode: "guest" | "member"; initial?: DisplayPrefs }) {
  const [prefs, setPrefs] = useState<DisplayPrefs>(initial ?? DEFAULT_DISPLAY);
  const [loaded, setLoaded] = useState(mode === "member");
  const [state, setState] = useState<ActionState>(idle);
  const [pending, startTransition] = useTransition();
  const saveSeq = useRef(0);
  const [resetCount, setResetCount] = useState(0);

  // Gäste: gespeicherte Auswahl dieses Geräts nach dem Laden übernehmen
  useEffect(() => {
    if (mode !== "guest") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(readDisplay());
    setLoaded(true);
  }, [mode]);

  function update(next: DisplayPrefs) {
    setPrefs(next);
    applyDisplay(next); // sofortige Vorschau auf der ganzen Seite
    if (mode === "guest") {
      setState({ status: "success", message: "Auf diesem Gerät gespeichert." });
      return;
    }
    const seq = ++saveSeq.current;
    setState(idle);
    startTransition(async () => {
      const result = await saveDisplayPrefsAction({
        theme: next.theme,
        textScale: next.textScale as 100 | 112 | 125 | 150,
        motion: next.motion,
        simple: next.simple,
      });
      // Nur die Antwort auf die letzte Änderung anzeigen
      if (seq === saveSeq.current) setState(result);
    });
  }

  function onRadioChange(e: React.FormEvent<HTMLDivElement>) {
    const t = e.target as HTMLInputElement;
    if (t.type !== "radio" || !t.checked) return;
    if (t.name === "theme") update({ ...prefs, theme: t.value as DisplayPrefs["theme"] });
    if (t.name === "textScale") update({ ...prefs, textScale: Number(t.value) });
    if (t.name === "motion") update({ ...prefs, motion: t.value as DisplayPrefs["motion"] });
  }

  const isDefault =
    prefs.theme === DEFAULT_DISPLAY.theme &&
    prefs.textScale === DEFAULT_DISPLAY.textScale &&
    prefs.motion === DEFAULT_DISPLAY.motion &&
    prefs.simple === DEFAULT_DISPLAY.simple;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
      <div className="flex flex-col gap-8" onChange={onRadioChange}>
        {/* key: nach dem Laden der Gerätewerte neu aufbauen, damit die Auswahl stimmt */}
        <div key={`${loaded ? "ready" : "init"}-${resetCount}`} className="flex flex-col gap-8">
          <RadioCards
            name="theme"
            legend="Farbschema"
            hint="«Wie mein Gerät» folgt der Einstellung deines Betriebssystems."
            columns={3}
            defaultValue={prefs.theme}
            options={[
              { value: "system", label: "Wie mein Gerät" },
              { value: "light", label: "Hell" },
              { value: "dark", label: "Dunkel" },
            ]}
          />
          <RadioCards
            name="textScale"
            legend="Schriftgrösse"
            hint="Alle Inhalte und Bedienelemente wachsen mit. Nichts wird ausgeblendet."
            columns={2}
            defaultValue={String(prefs.textScale)}
            options={[
              { value: "100", label: "Standard (100 %)" },
              { value: "112", label: "Etwas grösser (112 %)" },
              { value: "125", label: "Gross (125 %)" },
              { value: "150", label: "Sehr gross (150 %)" },
            ]}
          />
          <RadioCards
            name="motion"
            legend="Bewegung"
            hint="Betrifft dekorative Animationen und Übergänge. Gespeichert wird nie über eine Animation angezeigt."
            columns={3}
            defaultValue={prefs.motion}
            options={[
              { value: "system", label: "Wie mein Gerät" },
              { value: "reduce", label: "Reduzieren" },
              { value: "allow", label: "Erlauben" },
            ]}
          />
        </div>
        <Card>
          <Switch
            name="simple"
            label="Einfache Ansicht"
            description="Weniger Karten und Zusatzinformationen, keine Animationen. Navigation, Hilfe, Datenschutz und Melden bleiben immer erreichbar."
            checked={prefs.simple}
            onChange={(e) => update({ ...prefs, simple: e.target.checked })}
          />
        </Card>

        <div className="flex flex-col gap-3">
          <FormMessage state={pending ? { status: "idle" } : state} />
          {pending && (
            <p role="status" className="flex items-center gap-2 text-base text-ink-2">
              <Icon name="loader" className="size-5 motion-safe:animate-spin" />
              Wird gespeichert …
            </p>
          )}
          <div>
            <Button
              variant="ghost"
              icon={<Icon name="undo" className="size-5" />}
              disabled={isDefault}
              onClick={() => {
                update(DEFAULT_DISPLAY);
                setResetCount((c) => c + 1);
              }}
              type="button"
            >
              Auf Standard zurücksetzen
            </Button>
          </div>
        </div>
      </div>

      <aside aria-labelledby="display-preview" className="flex flex-col gap-3 lg:sticky lg:top-6">
        <h2 id="display-preview" className="text-lg font-[650] text-ink">
          Vorschau
        </h2>
        <div className="rounded-[28px] border border-line bg-sunk p-2" aria-hidden="true">
          <div className="flex flex-col gap-3 rounded-[20px] bg-surface p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-2">Beispiel</p>
            <p className="text-xl font-[650] text-ink">So sieht ein Abschnitt aus</p>
            <p className="text-base text-ink-2">
              Kurzer Fliesstext in der gewählten Grösse. Buttons und Felder wachsen mit und bleiben vollständig sichtbar.
            </p>
            <span className={buttonClass("primary", "md", "w-fit")}>Hauptaktion</span>
          </div>
        </div>
        {mode === "guest" ? (
          <Notice tone="neutral">
            Diese Einstellungen gelten nur auf diesem Gerät und brauchen kein Konto. Mit einem Konto werden sie auf allen
            deinen Geräten übernommen.
          </Notice>
        ) : (
          <p className="text-sm text-ink-2">Änderungen gelten sofort und werden für alle deine Geräte gespeichert.</p>
        )}
      </aside>
    </div>
  );
}
