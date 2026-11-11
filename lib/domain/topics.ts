import type { AttendanceMode, PrayerTopic } from "@/lib/domain/types"

export const TOPICS: { value: PrayerTopic; label: string; hint: string }[] = [
  { value: "healing", label: "Healing", hint: "Physical health or illness" },
  { value: "emotional", label: "Emotional", hint: "Anxiety, grief, peace of mind" },
  { value: "family", label: "Family", hint: "Relationships and loved ones" },
  { value: "deliverance", label: "Deliverance", hint: "Freedom from oppression or fear" },
  { value: "forgiveness", label: "Forgiveness", hint: "Forgiving or being forgiven" },
  { value: "other", label: "Something else", hint: "Anything on your heart" },
]

export const topicLabel = (t: PrayerTopic) =>
  TOPICS.find((x) => x.value === t)?.label ?? "Other"

export const modeLabel = (m: AttendanceMode) =>
  m === "online" ? "Online by Zoom" : "In person"
