"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import type { ActionState } from "@/lib/action-state";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { Icon } from "./icon";

/**
 * Formularbausteine (A04): sichtbare Labels, Hinweise und zugeordnete Fehlermeldungen
 * über aria-describedby. Pflichtangaben werden textlich, nicht nur farblich markiert.
 */

const control =
  "w-full rounded-[12px] border border-field bg-surface px-4 text-base text-ink placeholder:text-ink-3 transition-colors duration-150 hover:border-ink-2 focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-1 aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:bg-sunk";

export function Field({
  label,
  hint,
  error,
  required,
  optional,
  children,
  id: idProp,
  className,
  counter,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  id?: string;
  className?: string;
  counter?: ReactNode;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean; required?: boolean }) => ReactNode;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        {/* Reflow (A02): lange Beschriftungen brechen um statt die Seite zu verbreitern */}
        <label htmlFor={id} className="min-w-0 break-words text-base font-semibold text-ink">
          {label}
          {required && <span className="ml-1.5 text-sm font-normal text-ink-2">(erforderlich)</span>}
          {optional && <span className="ml-1.5 text-sm font-normal text-ink-2">(optional)</span>}
        </label>
        {counter}
      </div>
      {hint && (
        <p id={hintId} className="-mt-1 text-sm text-ink-2">
          {hint}
        </p>
      )}
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined, required })}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-danger">
          <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-32 resize-y py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(control, "h-12 appearance-none pr-11", className)} {...props}>
        {children}
      </select>
      <Icon
        name="chevron-down"
        className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-ink-2"
      />
    </div>
  );
}

/** Textfeld mit sichtbarem Zeichenzähler und Entfernen-Möglichkeit (PRD 05) */
export function CountedTextarea({
  label,
  name,
  maxLength,
  hint,
  error,
  defaultValue,
  required,
  optional,
  rows = 5,
  placeholder,
}: {
  label: string;
  name: string;
  maxLength: number;
  hint?: ReactNode;
  error?: string;
  defaultValue?: string;
  required?: boolean;
  optional?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const remaining = maxLength - value.length;
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      counter={
        <span className={cn("tabular text-sm", remaining < 0 ? "text-danger" : "text-ink-2")} aria-live="polite">
          {value.length.toLocaleString("de-CH")} / {maxLength.toLocaleString("de-CH")}
        </span>
      }
    >
      {(p) => (
        <div className="flex flex-col gap-2">
          <Textarea
            {...p}
            name={name}
            rows={rows}
            maxLength={maxLength}
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
          />
          {value.length > 0 && !required && (
            <button
              type="button"
              onClick={() => setValue("")}
              className="self-start rounded-[8px] px-1 text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-ink"
            >
              Text entfernen
            </button>
          )}
        </div>
      )}
    </Field>
  );
}

export function Checkbox({
  label,
  description,
  className,
  error,
  ...props
}: { label: ReactNode; description?: ReactNode; error?: string } & Omit<ComponentProps<"input">, "type">) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={props.id ?? id} className="group flex cursor-pointer items-start gap-3">
        <span className="relative mt-0.5 inline-flex size-6 shrink-0">
          <input
            id={props.id ?? id}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${props.id ?? id}-err` : undefined}
            className="peer size-6 cursor-pointer appearance-none rounded-[6px] border border-field bg-surface transition-colors checked:border-ink checked:bg-ink hover:border-ink-2 aria-[invalid=true]:border-danger"
            {...props}
          />
          <Icon
            name="check"
            className="pointer-events-none absolute inset-0 m-auto size-4 text-ink-inverse opacity-0 peer-checked:opacity-100"
            strokeWidth={2.5}
          />
        </span>
        {/* Reflow (A02): lange Wörter brechen bei 320px/150 % Schrift um */}
        <span className="flex min-w-0 flex-col gap-0.5 [overflow-wrap:anywhere]">
          <span className="text-base text-ink">{label}</span>
          {description && <span className="text-sm text-ink-2">{description}</span>}
        </span>
      </label>
      {error && (
        <p id={`${props.id ?? id}-err`} className="ml-9 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Auswahlkarten als Radiogruppe (z. B. Zielgruppe, Kanal) */
export function RadioCards({
  name,
  legend,
  options,
  defaultValue,
  error,
  hint,
  required,
  columns = 1,
}: {
  name: string;
  legend: string;
  options: { value: string; label: ReactNode; description?: ReactNode; disabled?: boolean }[];
  defaultValue?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  columns?: 1 | 2 | 3;
}) {
  const id = useId();
  return (
    <fieldset
      className="flex flex-col gap-3"
      aria-describedby={[error ? `${id}-e` : "", hint ? `${id}-h` : ""].join(" ").trim() || undefined}
    >
      <legend className="mb-1 text-base font-semibold text-ink">
        {legend}
        {required && <span className="ml-1.5 text-sm font-normal text-ink-2">(erforderlich)</span>}
      </legend>
      {hint && (
        <p id={`${id}-h`} className="-mt-2 text-sm text-ink-2">
          {hint}
        </p>
      )}
      <div className={cn("grid gap-2", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3")}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex min-h-14 cursor-pointer items-start gap-3 rounded-[12px] border border-line-2 bg-surface p-4 transition-colors hover:border-field has-[:checked]:border-ink has-[:checked]:bg-raised has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              defaultChecked={defaultValue === o.value}
              disabled={o.disabled}
              required={required}
              className="peer mt-1 size-5 shrink-0 cursor-pointer appearance-none rounded-full border border-field bg-surface outline-none checked:border-[6px] checked:border-ink"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold text-ink">{o.label}</span>
              {o.description && <span className="text-sm text-ink-2">{o.description}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-e`} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/**
 * Skala als beschriftete Radiogruppe ohne voreingestellten Wert (DIA01).
 * Jede Stufe hat ≥ 44px Touchfläche; Endpunkte sind textlich erklärt.
 */
export function ScalePicker({
  name,
  legend,
  min,
  max,
  minText,
  maxText,
  stepLabels,
  help,
  defaultValue,
  error,
  allowClear = true,
}: {
  name: string;
  legend: string;
  min: number;
  max: number;
  minText?: string;
  maxText?: string;
  stepLabels?: string[];
  help?: string;
  defaultValue?: number | null;
  error?: string;
  allowClear?: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState<number | null>(defaultValue ?? null);
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const selectedLabel = value === null ? "nicht erfasst" : (stepLabels?.[value - min] ?? String(value));
  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={`${id}-help ${error ? `${id}-err` : ""}`.trim()}>
      <legend className="text-lg font-semibold text-ink">{legend}</legend>
      {help && (
        <p id={`${id}-help`} className="-mt-1 text-sm text-ink-2">
          {help}
        </p>
      )}
      <div
        className={cn("grid gap-1.5", values.length > 6 ? "grid-cols-6 sm:grid-cols-11" : "grid-cols-5")}
        role="presentation"
      >
        {values.map((v) => (
          <label key={v} className="relative">
            <input
              type="radio"
              name={name}
              value={v}
              checked={value === v}
              onChange={() => setValue(v)}
              className="peer absolute inset-0 cursor-pointer opacity-0"
              aria-label={stepLabels?.[v - min] ?? `${v}${v === min && minText ? ` – ${minText}` : ""}${v === max && maxText ? ` – ${maxText}` : ""}`}
            />
            <span className="tabular flex h-12 items-center justify-center rounded-[12px] border border-line-2 bg-surface text-base font-semibold text-ink transition-colors peer-hover:border-field peer-checked:border-ink peer-checked:bg-ink peer-checked:text-ink-inverse peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]">
              {v}
            </span>
          </label>
        ))}
      </div>
      {(minText || maxText) && (
        <div className="flex justify-between gap-4 text-sm text-ink-2" aria-hidden="true">
          <span>{minText}</span>
          <span className="text-right">{maxText}</span>
        </div>
      )}
      {stepLabels && (
        <ul className="sr-only">
          {stepLabels.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-ink-2">
          Auswahl: <strong className="font-semibold text-ink">{selectedLabel}</strong>
        </span>
        {allowClear && value !== null && (
          <button
            type="button"
            onClick={() => setValue(null)}
            className="rounded-[8px] px-1 font-medium text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            Auswahl entfernen
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-err`} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Schalter (als Checkbox mit Rolle switch) */
export function Switch({
  label,
  description,
  ...props
}: { label: ReactNode; description?: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  const id = useId();
  return (
    <label htmlFor={props.id ?? id} className="flex cursor-pointer items-start justify-between gap-6 py-1">
      <span className="flex min-w-0 flex-col gap-0.5 [overflow-wrap:anywhere]">
        <span className="font-semibold text-ink">{label}</span>
        {description && <span className="text-sm text-ink-2">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex h-7 w-12 shrink-0">
        <input
          id={props.id ?? id}
          type="checkbox"
          role="switch"
          className="peer absolute inset-0 cursor-pointer appearance-none rounded-full border border-field bg-sunk transition-colors checked:border-ink checked:bg-ink"
          {...props}
        />
        <span className="pointer-events-none absolute left-1 top-1 size-5 rounded-full bg-field transition-transform duration-150 peer-checked:translate-x-5 peer-checked:bg-ink-inverse" />
      </span>
    </label>
  );
}

/** Absende-Button mit Ladezustand; Erfolg erst nach Serverbestätigung (HOM07). */
export function SubmitButton({
  children,
  pendingText = "Wird gespeichert …",
  variant = "primary",
  size = "md",
  className,
  icon,
  ...props
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
} & Omit<ComponentProps<"button">, "type">) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      aria-disabled={pending || undefined}
      disabled={pending || props.disabled}
      icon={pending ? <Icon name="loader" className="size-5 motion-safe:animate-spin" /> : icon}
      {...props}
    >
      {pending ? pendingText : children}
    </Button>
  );
}

/**
 * Meldung zum Ergebnis einer Aktion. Erfolg als status, Fehler als alert –
 * ohne den Fokus willkürlich zu verschieben (A04).
 */
export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (state.status === "idle" || !state.message) {
    return <div role="status" aria-live="polite" className="sr-only" />;
  }
  const isError = state.status === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-3 rounded-[12px] border px-4 py-3 text-base",
        isError ? "border-danger/30 bg-danger-soft text-ink" : "border-success/30 bg-success-soft text-ink",
        className,
      )}
    >
      <Icon
        name={isError ? "alert" : "check-circle"}
        className={cn("mt-0.5 size-5 shrink-0", isError ? "text-danger" : "text-success")}
      />
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">{state.message}</p>
        {state.correlationId && <p className="text-sm text-ink-2">Referenz für den Support: {state.correlationId}</p>}
      </div>
    </div>
  );
}

/** Ereignis, mit dem z. B. die Sitzungswarnung Entwürfe bewusst verwirft (keine Rückfrage beim Abmelden). */
export const DISCARD_DRAFTS_EVENT = "ms:discard-drafts";

const LEAVE_PROMPT = "Du hast ungespeicherte Eingaben. Möchtest du die Seite trotzdem verlassen? Nicht gespeicherte Eingaben gehen verloren.";

/**
 * Warnt beim Verlassen mit ungespeicherten Eingaben (PRD 04 «Gemeinsame Zustände»): beim Schliessen
 * oder Neuladen (beforeunload) und bei Links innerhalb der Plattform. Nach dem Absenden oder bei
 * automatischer Abmeldung (DISCARD_DRAFTS_EVENT) entfällt die Rückfrage.
 */
export function UnsavedChangesGuard({ formId }: { formId: string }) {
  const dirty = useRef(false);
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;
    const mark = () => (dirty.current = true);
    const clear = () => (dirty.current = false);
    form.addEventListener("input", mark);
    form.addEventListener("submit", clear);
    document.addEventListener(DISCARD_DRAFTS_EVENT, clear);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    // Vor dem Link-Handler von Next.js (Capture-Phase am Dokument): Navigation nur nach Bestätigung.
    const onClick = (e: MouseEvent) => {
      if (!dirty.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target === "_blank" || link.hasAttribute("download") || link.origin !== window.location.origin) return;
      // Bewusstes Verwerfen ohne Rückfrage, z. B. «Überspringen» beim Check-in (US03: keine Warnung).
      if (link.hasAttribute("data-discard")) return;
      if (link.pathname === window.location.pathname && link.search === window.location.search) return;
      if (window.confirm(LEAVE_PROMPT)) {
        dirty.current = false;
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      form.removeEventListener("input", mark);
      form.removeEventListener("submit", clear);
      document.removeEventListener(DISCARD_DRAFTS_EVENT, clear);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [formId]);
  return null;
}

/** Eindeutige Vorgangskennung für idempotente Wiederholung (PRD 14). */
export function OperationId({ name = "clientOpId" }: { name?: string }) {
  // Nach dem Mount erzeugt, damit Server- und Client-Markup übereinstimmen. Bleibt bei
  // Wiederholungen gleich; ohne JavaScript erzeugt der Server eine Kennung.
  const [opId, setOpId] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpId(crypto.randomUUID());
  }, []);
  return <input type="hidden" name={name} value={opId} />;
}
