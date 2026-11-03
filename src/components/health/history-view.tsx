"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Checkbox, Field, Select } from "@/components/ui/form";
import { Table } from "@/components/ui/primitives";
import { consecutiveRuns } from "@/server/modules/health/validation";
import type { HistoryRow, SeriesKey } from "./history-rows";

/**
 * S25 Verlauf (DIA06, DIA07, US08): flaches SVG ohne Chart-Paket.
 * – Einzelwerte, keine Glättung, keine Prognose, keine Schwellen, kein Score
 * – Linien nur zwischen aufeinanderfolgenden Tagen: Lücken bleiben Lücken
 * – je Skala ein eigenes Feld (keine zweite y-Achse), Reihen zusätzlich über Form unterscheidbar
 * – Diagramm aria-hidden; die Datentabelle ist gleichwertig: jede Markierung = eine Zeile
 * Der Filter läuft nur im Browser – Symptombezeichnungen gelangen nie in die URL.
 */

type SeriesDef = {
  key: SeriesKey;
  label: string;
  color: string;
  shape: "circle" | "square" | "diamond" | "ring" | "triangle";
  line: boolean;
  dash?: string;
};

const SERIES: Record<SeriesKey, SeriesDef> = {
  energy: { key: "energy", label: "Energie (Check-in)", color: "var(--chart-energy)", shape: "circle", line: true },
  mood: { key: "mood", label: "Stimmung (Check-in)", color: "var(--chart-mood)", shape: "square", line: true, dash: "6 4" },
  fatigue_checkin: {
    key: "fatigue_checkin",
    label: "Fatigue (Check-in)",
    color: "var(--chart-fatigue)",
    shape: "diamond",
    line: true,
    dash: "2 3",
  },
  fatigue_diary: { key: "fatigue_diary", label: "Fatigue (Tagebuch)", color: "var(--chart-fatigue)", shape: "ring", line: false },
  symptom: { key: "symptom", label: "Symptomstärke (Tagebuch)", color: "var(--chart-symptom)", shape: "triangle", line: false },
};

const PANELS: { title: string; min: number; max: number; series: SeriesKey[] }[] = [
  { title: "Energie · 0 bis 10", min: 0, max: 10, series: ["energy"] },
  { title: "Stimmung · 1 bis 5", min: 1, max: 5, series: ["mood"] },
  { title: "Fatigue · 0 bis 10", min: 0, max: 10, series: ["fatigue_checkin", "fatigue_diary"] },
  { title: "Symptomstärke · 0 bis 10", min: 0, max: 10, series: ["symptom"] },
];

const W = 640;
const PAD_L = 34;
const PAD_R = 12;
const PLOT_H = 96;
const PAD_T = 10;
const AXIS_H = 22;
const H = PAD_T + PLOT_H + AXIS_H;

function Marker({ shape, x, y, color }: { shape: SeriesDef["shape"]; x: number; y: number; color: string }) {
  // 2px Flächenring um gefüllte Markierungen, damit überlappende Punkte trennbar bleiben.
  const ring = { stroke: "var(--surface)", strokeWidth: 2 };
  switch (shape) {
    case "circle":
      return <circle cx={x} cy={y} r={4.5} fill={color} {...ring} />;
    case "square":
      return <rect x={x - 4.5} y={y - 4.5} width={9} height={9} fill={color} {...ring} />;
    case "diamond":
      return <path d={`M${x} ${y - 5.5}L${x + 5.5} ${y}L${x} ${y + 5.5}L${x - 5.5} ${y}Z`} fill={color} {...ring} />;
    case "ring":
      return <circle cx={x} cy={y} r={4.5} fill="var(--surface)" stroke={color} strokeWidth={2} />;
    case "triangle":
      return <path d={`M${x} ${y - 5.5}L${x + 5.5} ${y + 4.5}L${x - 5.5} ${y + 4.5}Z`} fill={color} {...ring} />;
  }
}

export function LegendSwatch({ series }: { series: SeriesKey }) {
  const s = SERIES[series];
  return (
    <svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true" className="shrink-0">
      {s.line && <line x1={0} y1={7} x2={28} y2={7} stroke={s.color} strokeWidth={2} strokeDasharray={s.dash} />}
      <Marker shape={s.shape} x={14} y={7} color={s.color} />
    </svg>
  );
}

function tickStep(days: number) {
  if (days <= 8) return 1;
  if (days <= 31) return 5;
  if (days <= 92) return 14;
  return 30;
}

function Panel({
  title,
  min,
  max,
  rows,
  days,
  from,
  seriesKeys,
}: {
  title: string;
  min: number;
  max: number;
  rows: HistoryRow[];
  days: number;
  from: string;
  seriesKeys: SeriesKey[];
}) {
  const plotW = W - PAD_L - PAD_R;
  const xOf = (x: number) => PAD_L + (x / days) * plotW;
  const yOf = (v: number) => PAD_T + PLOT_H - ((v - min) / (max - min)) * PLOT_H;
  const step = tickStep(days);
  const ticks = Array.from({ length: Math.ceil(days / step) }, (_, i) => i * step);
  const mid = Math.round((min + max) / 2);
  const tickLabel = (offset: number) => {
    const [y, m, d] = from.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + offset));
    return `${dt.getUTCDate()}.${dt.getUTCMonth() + 1}.`;
  };

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-ink-2">{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="presentation">
        {[min, mid, max].map((v) => (
          <g key={v}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yOf(v)} y2={yOf(v)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD_L - 8} y={yOf(v) + 4} textAnchor="end" fontSize={12} fill="var(--ink-2)" className="tabular">
              {v}
            </text>
          </g>
        ))}
        {ticks.map((t) => (
          <text key={t} x={xOf(t + 0.5)} y={H - 4} textAnchor="middle" fontSize={12} fill="var(--ink-2)" className="tabular">
            {tickLabel(t)}
          </text>
        ))}
        {seriesKeys.map((key) => {
          const s = SERIES[key];
          const points = rows.filter((r) => r.series === key && r.value !== null);
          return (
            <g key={key}>
              {s.line &&
                consecutiveRuns(points, (r) => Math.floor(r.x))
                  .filter((run) => run.length > 1)
                  .map((run) => (
                    <polyline
                      key={run[0].key}
                      points={run.map((r) => `${xOf(r.x)},${yOf(r.value!)}`).join(" ")}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2}
                      strokeDasharray={s.dash}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ))}
              {points.map((r) => (
                <g key={r.key}>
                  <title>{`${r.dateLabel}${r.time ? `, ${r.time}` : ""} · ${r.measure}: ${r.valueText}`}</title>
                  <Marker shape={s.shape} x={xOf(r.x)} y={yOf(r.value!)} color={s.color} />
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function HistoryView({ rows, days, from }: { rows: HistoryRow[]; days: number; from: string }) {
  const present = useMemo(() => new Set(rows.filter((r) => r.value !== null).map((r) => r.series)), [rows]);
  const symptoms = useMemo(
    () => [...new Set(rows.filter((r) => r.series === "symptom").map((r) => r.symptom!))].sort((a, b) => a.localeCompare(b, "de-CH")),
    [rows],
  );
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    energy: true,
    mood: true,
    fatigue_checkin: true,
    fatigue_diary: true,
    symptom: true,
  });
  const [symptom, setSymptom] = useState("");

  const shown = rows.filter(
    (r) => visible[r.series] && (r.series !== "symptom" || symptom === "" || r.symptom === symptom),
  );
  const panels = PANELS.map((p) => ({ ...p, series: p.series.filter((k) => visible[k] && present.has(k)) })).filter(
    (p) => p.series.length > 0 && shown.some((r) => p.series.includes(r.series) && r.value !== null),
  );
  const available = (Object.keys(SERIES) as SeriesKey[]).filter((k) => rows.some((r) => r.series === k));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 rounded-[16px] border border-line bg-surface p-4 sm:p-5">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-base font-semibold text-ink">Angezeigte Angaben</legend>
          <p className="-mt-1 text-sm text-ink-2">Gilt für Diagramm und Datentabelle gleichermassen.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {available.map((k) => (
              <Checkbox
                key={k}
                name={`zeige_${k}`}
                checked={visible[k]}
                onChange={(e) => setVisible((v) => ({ ...v, [k]: e.target.checked }))}
                label={
                  <span className="inline-flex items-center gap-2">
                    <LegendSwatch series={k} />
                    {SERIES[k].label}
                  </span>
                }
              />
            ))}
          </div>
        </fieldset>
        {symptoms.length > 1 && visible.symptom && (
          <Field label="Symptom" hint="Zeigt nur dieses Symptom an." className="sm:max-w-sm">
            {(p) => (
              <Select {...p} value={symptom} onChange={(e) => setSymptom(e.target.value)}>
                <option value="">Alle Symptome</option>
                {symptoms.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </div>

      {panels.length > 0 ? (
        <div aria-hidden="true" className="flex flex-col gap-4">
          {/* Ergänzende Grafik: nicht fokussierbar, weil für Screenreader verborgen; die Datentabelle ist gleichwertig (A01). */}
          <div className="relative overflow-x-auto" tabIndex={-1}>
            <div className="flex min-w-[560px] flex-col gap-5">
              {panels.map((p) => (
                <Panel
                  key={p.title}
                  title={p.title}
                  min={p.min}
                  max={p.max}
                  rows={shown}
                  days={days}
                  from={from}
                  seriesKeys={p.series}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-ink-2">
            Jede Markierung ist ein eigener Eintrag. Linien verbinden nur Check-ins an aufeinanderfolgenden Tagen; Tage ohne
            Eintrag bleiben leer.
          </p>
        </div>
      ) : (
        <p className="text-base text-ink-2">Für die gewählten Angaben gibt es in diesem Zeitraum keine Werte.</p>
      )}

      <section aria-labelledby="datentabelle" className="flex flex-col gap-3">
        <h2 id="datentabelle" className="text-xl font-[650] text-ink">
          Datentabelle
        </h2>
        <p className="text-base text-ink-2">
          {shown.length === 1 ? "1 Angabe" : `${shown.length} Angaben`}, chronologisch. «nicht erfasst» bedeutet: an diesem
          Tag ohne Angabe – das ist kein Wert von 0.
        </p>
        <Table>
          <caption className="sr-only">Selbst dokumentierte Beobachtungen im gewählten Zeitraum</caption>
          <thead>
            <tr>
              <th scope="col">Datum</th>
              <th scope="col">Uhrzeit</th>
              <th scope="col">Quelle</th>
              <th scope="col">Angabe</th>
              <th scope="col">Wert</th>
              <th scope="col">
                <span className="sr-only">Eintrag öffnen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.key}>
                <td className="tabular whitespace-nowrap">{r.dateLabel}</td>
                <td className="tabular whitespace-nowrap">{r.time ?? <span className="text-ink-2">ganzer Tag</span>}</td>
                <td className="whitespace-nowrap">{r.source}</td>
                <td className="min-w-40">{r.measure}</td>
                <td className={r.value === null ? "whitespace-nowrap text-ink-2" : "whitespace-nowrap"}>{r.valueText}</td>
                <td className="whitespace-nowrap">
                  <Link href={r.href} className="font-medium text-ink underline underline-offset-4">
                    Ansehen<span className="sr-only">: {r.source} vom {r.dateLabel}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>
    </div>
  );
}
