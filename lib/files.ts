import { MINISTRY } from "@/lib/config/ministry"
import { slotEndIso } from "@/lib/domain/time"

/** Triggers a browser download of generated text content. */
export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---------- Calendar invite (.ics) ---------- */

const icsDate = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "")
const icsEscape = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n")

export function sessionIcs(opts: { id: string; start: string; online: boolean; zoomLink?: string }): string {
  const { location } = MINISTRY
  const where = opts.online
    ? opts.zoomLink ?? "Online (Zoom link in your confirmation email)"
    : `${location.name}, ${location.street}, ${location.city}`
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Healing Prayer Northwest//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${opts.id}@healingprayernorthwest`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(opts.start)}`,
    `DTEND:${icsDate(slotEndIso(opts.start))}`,
    `SUMMARY:${icsEscape(`Prayer session · ${MINISTRY.name}`)}`,
    `LOCATION:${icsEscape(where)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Prayer session today",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
}

/* ---------- Spreadsheet export (.csv) ---------- */

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v)
  // Neutralise spreadsheet formula injection and quote everything.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return "﻿" + [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")
}
