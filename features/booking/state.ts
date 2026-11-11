import type { AttendanceMode, Booking, PrayerTopic } from "@/lib/domain/types"

export type WizardStep = "day" | "time" | "details" | "review" | "done"

export interface BookingDetails {
  topic: PrayerTopic
  prayerPoints: string
  mode: AttendanceMode
  onlineReason: string
}

export interface WizardState {
  step: WizardStep
  date?: string
  slotStart?: string
  details?: BookingDetails
  result?: Booking
}

export type WizardAction =
  | { type: "pickDate"; date: string }
  | { type: "pickSlot"; slotStart: string }
  | { type: "saveDetails"; details: BookingDetails }
  | { type: "goTo"; step: WizardStep }
  | { type: "next"; steps: WizardStep[] }
  | { type: "back"; steps: WizardStep[] }
  | { type: "done"; result: Booking }
  | { type: "slotLost"; resetDate?: boolean }

export const stepsFor = (reschedule: boolean): WizardStep[] =>
  reschedule ? ["day", "time", "review"] : ["day", "time", "details", "review"]

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
      const i = action.steps.indexOf(state.step)
      return { ...state, step: action.steps[Math.min(i + 1, action.steps.length - 1)] }
    }
    case "back": {
      const i = action.steps.indexOf(state.step)
      return { ...state, step: action.steps[Math.max(i - 1, 0)] }
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
