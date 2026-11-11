import { z } from "zod"

import { LIMITS } from "@/lib/config/ministry"

export const detailsSchema = z
  .object({
    topic: z.enum(["healing", "emotional", "family", "deliverance", "forgiveness", "other"], {
      error: "Please choose what your prayer is mostly about.",
    }),
    prayerPoints: z
      .string()
      .trim()
      .min(1, "Please share briefly what you'd like prayer for.")
      .max(LIMITS.prayerPointsMax, `Please keep it under ${LIMITS.prayerPointsMax} characters.`),
    mode: z.enum(["in_person", "online"]),
    onlineReason: z.string().trim().max(LIMITS.onlineReasonMax),
    agree: z.boolean().refine((v) => v, "Please confirm you've read the booking terms."),
  })
  .refine((v) => v.mode === "in_person" || v.onlineReason.length > 0, {
    path: ["onlineReason"],
    message: "Please tell us briefly why you need to join online.",
  })

export type DetailsValues = z.infer<typeof detailsSchema>
