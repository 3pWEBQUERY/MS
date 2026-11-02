"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";

/** Passwortfeld: Einfügen und Passwortmanager erlaubt, Anzeigen umschaltbar (ACC04, A04). */
export function PasswordField({
  name = "password",
  label = "Passwort",
  autoComplete,
  error,
  hint,
  showCounter,
  required = true,
}: {
  name?: string;
  label?: string;
  autoComplete: "current-password" | "new-password";
  error?: string;
  hint?: string;
  showCounter?: boolean;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [length, setLength] = useState(0);
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      counter={
        showCounter ? (
          <span className={`tabular text-sm ${length > 0 && length < 15 ? "text-ink-2" : length >= 15 ? "text-success" : "text-ink-2"}`}>
            {length} / mind. 15
          </span>
        ) : undefined
      }
    >
      {(p) => (
        <div className="relative">
          <Input
            {...p}
            name={name}
            type={visible ? "text" : "password"}
            autoComplete={autoComplete}
            required={required}
            minLength={autoComplete === "new-password" ? 15 : undefined}
            maxLength={128}
            spellCheck={false}
            autoCapitalize="none"
            onChange={(e) => setLength(e.target.value.length)}
            className="pr-14"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}
            className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-[9px] text-ink-2 hover:bg-sunk hover:text-ink"
          >
            <Icon name={visible ? "eye-off" : "eye"} className="size-5" />
          </button>
        </div>
      )}
    </Field>
  );
}
