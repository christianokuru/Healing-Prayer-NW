import type { BookingDetails } from "./state"

/**
 * Keeps typed prayer points safe in this tab if the page reloads,
 * the session expires or a slot is taken mid-booking.
 */
const KEY = "hpn.booking-draft"

export function loadDraft(): Partial<BookingDetails> | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Partial<BookingDetails>) : null
  } catch {
    return null
  }
}

export function saveDraft(details: Partial<BookingDetails>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(details))
  } catch {
    // Storage unavailable: drafts are a convenience only.
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
