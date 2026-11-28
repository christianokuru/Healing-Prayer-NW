import type { CreatedBooking, PublicApi } from "@/lib/api/contracts"
import type { ManagedBooking, ThursdayAvailability } from "@/lib/domain/types"

import { raw, request, seg } from "./http"

interface SlotPoll {
  pollAfterSeconds: number
  days: ThursdayAvailability[]
}

/**
 * The slots endpoint is built for polling: we send back its ETag and get an
 * empty 304 when nothing changed, then reuse the last answer.
 */
let lastPoll: { etag: string; days: ThursdayAvailability[] } | null = null

export const livePublicApi: PublicApi = {
  async getAvailability() {
    const headers: Record<string, string> = lastPoll ? { "If-None-Match": lastPoll.etag } : {}
    const res = await raw<SlotPoll>("GET", "/availability/slots", { headers })
    if (res.status === 304 && lastPoll) return lastPoll.days
    const days = res.data?.days ?? []
    const etag = res.headers.get("etag")
    lastPoll = etag ? { etag, days } : null
    return days
  },

  async createBooking(input) {
    const result = await request<CreatedBooking>("POST", "/bookings", {
      body: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        prayerPoints: input.prayerPoints,
        slotStart: input.slotStart,
        online: input.online,
        onlineReason: input.online ? input.onlineReason : undefined,
        website: input.website || undefined,
      },
    })
    // Their new booking changes the slots, so don't trust the cached copy.
    lastPoll = null
    return result
  },

  getManagedBooking(token) {
    return request<ManagedBooking>("GET", `/manage/${seg(token.trim())}`)
  },

  async cancelManagedBooking(token) {
    const booking = await request<ManagedBooking>("POST", `/manage/${seg(token.trim())}/cancel`)
    lastPoll = null
    return booking
  },

  sendLateNotice(token, message) {
    const text = message?.trim()
    return request<ManagedBooking>("POST", `/manage/${seg(token.trim())}/late-notice`, {
      body: text ? { message: text } : {},
    })
  },
}
