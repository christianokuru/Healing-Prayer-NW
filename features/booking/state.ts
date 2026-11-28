import type { CreatedBooking } from "@/lib/api/contracts"

export type WizardStep = "day" | "time" | "details" | "review" | "done"

export const STEPS: WizardStep[] = ["day", "time", "details", "review"]

export interface BookingDetails {
  fullName: string
  email: string
  phone: string
  prayerPoints: string
  /** "I can't come in person, please join by Zoom." */
  online: boolean
  onlineReason: string
  /** Honeypot: hidden from people, filled in by bots. */
  website: string
}

export interface WizardState {
  step: WizardStep
  date?: string
  slotStart?: string
  details?: BookingDetails
  result?: CreatedBooking
}

export type WizardAction =
  | { type: "pickDate"; date: string }
  | { type: "pickSlot"; slotStart: string }
  | { type: "saveDetails"; details: BookingDetails }
  | { type: "goTo"; step: WizardStep }
  | { type: "next" }
  | { type: "back" }
  | { type: "done"; result: CreatedBooking }
  | { type: "slotLost"; resetDate?: boolean }

/** Pure reducer: every wizard transition lives here and is easy to test. */
export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "pickDate":
      return state.date === action.date ? state : { ...state, date: action.date, slotStart: undefined }
    case "pickSlot":
      return { ...state, slotStart: action.slotStart }
    case "saveDetails":
      return { ...state, details: action.details }
    case "goTo":
      return { ...state, step: action.step }
    case "next": {
      const i = STEPS.indexOf(state.step)
      return { ...state, step: STEPS[Math.min(i + 1, STEPS.length - 1)] }
    }
    case "back": {
      const i = STEPS.indexOf(state.step)
      return { ...state, step: STEPS[Math.max(i - 1, 0)] }
    }
    case "done":
      return { ...state, step: "done", result: action.result }
    case "slotLost":
      return {
        ...state,
        step: action.resetDate ? "day" : "time",
        slotStart: undefined,
        date: action.resetDate ? undefined : state.date,
      }
  }
}
