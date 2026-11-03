"use client";

import { useState } from "react";
import { MemberProfileCard } from "@/components/account/profile-card";
import { Checkbox, Field, FormMessage, Input, Select, SubmitButton, Switch, UnsavedChangesGuard } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Card, Notice } from "@/components/ui/primitives";
import { CANTONS, INTERESTS } from "@/lib/catalog";
import { updateProfileAction } from "@/server/modules/account/profile-actions";
import { useHealthAction } from "@/components/health/use-health-action";

type Props = {
  profile: { pseudonym: string; interests: string[]; canton: string | null; discoverable: boolean; version: number };
};

/** S09: Bearbeitung mit Live-Vorschau der Mitgliedersicht (dieselbe Komponente wie S10, US12). */
export function ProfileForm({ profile }: Props) {
  const [state, action] = useHealthAction(updateProfileAction);
  const [pseudonym, setPseudonym] = useState(profile.pseudonym);
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [canton, setCanton] = useState(profile.canton ?? "");
  const [discoverable, setDiscoverable] = useState(profile.discoverable);
  const version = typeof state.data?.version === "number" ? state.data.version : profile.version;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
      <form id="profile-form" action={action} noValidate className="flex max-w-2xl flex-col gap-8">
        <UnsavedChangesGuard formId="profile-form" />
        <input type="hidden" name="version" value={version} />
        <FormMessage state={state} />

        <Field
          label="Pseudonym"
          required
          hint="2 bis 40 Zeichen. Keine Begriffe, die eine Fach- oder Plattformrolle andeuten."
          error={state.fieldErrors?.pseudonym}
        >
          {(p) => (
            <Input {...p} name="pseudonym" autoComplete="nickname" maxLength={40} value={pseudonym} onChange={(e) => setPseudonym(e.target.value)} />
          )}
        </Field>

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
                onChange={(e) => setInterests((list) => (e.target.checked ? [...list, code] : list.filter((c) => c !== code)))}
              />
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3">
          <Notice tone="accent" icon="eye" title="Der Kanton ist für Mitglieder sichtbar">
            Mit einer Angabe sehen angemeldete Mitglieder deinen Kanton im Profil. «Keine Angabe» entfernt ihn sofort.
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

        <Card>
          <Switch
            name="discoverable"
            label="In der Mitgliedersuche auffindbar"
            description="Ausgeschaltet erscheinst du nicht in der Suche. Deine Beiträge führen weiterhin zu diesem kurzen Profil."
            checked={discoverable}
            onChange={(e) => setDiscoverable(e.target.checked)}
          />
        </Card>

        <div>
          <SubmitButton size="lg" icon={<Icon name="check" className="size-5" />}>
            Profil speichern
          </SubmitButton>
        </div>
      </form>

      <aside aria-labelledby="preview-title" className="flex flex-col gap-3 lg:sticky lg:top-6">
        <h2 id="preview-title" className="text-lg font-[650] text-ink">
          So sehen dich andere Mitglieder
        </h2>
        <p className="text-sm text-ink-2" id="preview-hint">
          Die Vorschau zeigt genau die Felder des sichtbaren Profils und folgt deinen Eingaben sofort. Gespeichert wird erst
          mit «Profil speichern».
        </p>
        <MemberProfileCard profile={{ pseudonym, interests, canton: canton || null }} />
        <p className="flex items-center gap-2 text-sm text-ink-2">
          <Icon name={discoverable ? "search" : "eye-off"} className="size-4" />
          {discoverable ? "Auffindbar in der Mitgliedersuche" : "Nicht in der Mitgliedersuche"}
        </p>
        <p className="text-sm text-ink-2">Nie sichtbar: E-Mail-Adresse, letzte Anmeldung, Tagebuch und Gesundheitsangaben.</p>
      </aside>
    </div>
  );
}
