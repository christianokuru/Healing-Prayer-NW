import { z } from "zod"

import { emailField } from "@/features/auth/schemas"
import { LIMITS } from "@/lib/config/ministry"

export const detailsSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Please enter your full name.")
      .max(LIMITS.nameMax, "That name is too long."),
    email: emailField,
    phone: z
      .string()
      .trim()
      .max(LIMITS.phoneMax, "That phone number is too long.")
      .refine((v) => v.replace(/\D/g, "").length >= 10, "Please enter a phone number with the area code."),
    prayerPoints: z
      .string()
      .trim()
      .min(1, "Please share briefly what you'd like prayer for.")
      .max(LIMITS.prayerPointsMax, `Please keep it under ${LIMITS.prayerPointsMax} characters.`),
    online: z.boolean(),
    onlineReason: z.string().trim().max(LIMITS.onlineReasonMax),
    website: z.string(),
    agree: z.boolean().refine((v) => v, "Please tick the box to say you've read the privacy notice."),
  })
  .refine((v) => !v.online || v.onlineReason.length > 0, {
    path: ["onlineReason"],
    message: "Please tell us briefly why you can't come in person.",
  })

export type DetailsValues = z.infer<typeof detailsSchema>
