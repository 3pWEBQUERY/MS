import "server-only";
import type { StaffRole, Viewer } from "../../auth/viewer";

/** Rollen der Inhaltsverwaltung (PRD 03). */
export const EDITOR_ROLES: StaffRole[] = ["editor", "admin"];
export const EDITORIAL_AREA_ROLES: StaffRole[] = ["editor", "medical_reviewer", "admin"];
export const REVIEWER_ROLES: StaffRole[] = ["medical_reviewer"];
export const WITHDRAW_ROLES: StaffRole[] = ["editor", "medical_reviewer", "admin"];

/** Rolle, unter der eine Aktion protokolliert wird (erste passende). */
export function actingRole(viewer: Viewer, allowed: StaffRole[]): StaffRole {
  return viewer.roles.find((r) => allowed.includes(r)) ?? allowed[0];
}

/** Datum «YYYY-MM-DD» als Ende des Tages in Europe/Zurich; null bei ungültiger Angabe. */
export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T21:59:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export function addDaysTo(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400_000);
}

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
