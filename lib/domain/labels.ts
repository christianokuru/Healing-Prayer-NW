import type { AttendanceMode } from "@/lib/domain/types"

export const modeLabel = (m: AttendanceMode) => (m === "online" ? "Online by Zoom" : "In person")
