import { afterEach, describe, expect, it, vi } from "vitest"

import { lostChoice } from "@/features/booking/state"
import { ApiError } from "@/lib/api/errors"
import type { ThursdayAvailability } from "@/lib/domain/types"

import { liveAuthApi } from "./auth"
import { request } from "./http"
import { livePublicApi } from "./public"

function respond(status: number, body?: unknown, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  })
}

function mockFetch(...responses: Response[]) {
  const fn = vi.fn<typeof fetch>()
  for (const r of responses) fn.mockResolvedValueOnce(r)
  vi.stubGlobal("fetch", fn)
  return fn
}

const day = (state: ThursdayAvailability["state"], slot: "open" | "taken"): ThursdayAvailability => ({
  date: "2026-12-03",
  state,
  openCount: slot === "open" ? 1 : 0,
  slots: [{ start: "2026-12-04T01:00:00.000Z", state: slot }],
})

afterEach(() => vi.unstubAllGlobals())

describe("live http", () => {
  it("calls the same-origin bridge and drops nulls", async () => {
    const fetchFn = mockFetch(respond(200, { id: "b1", zoomLink: null }))
    const data = await request<{ id: string; zoomLink?: string }>("GET", "/manage/abc", { query: { a: "1", b: undefined } })
    expect(fetchFn.mock.calls[0][0]).toBe("/api/manage/abc?a=1")
    expect(data).toEqual({ id: "b1" })
    expect("zoomLink" in data).toBe(false)
  })

  it("turns the API's error shape into ApiError", async () => {
    mockFetch(respond(409, { code: "slot_taken", message: "Someone just took that time." }))
    await expect(request("POST", "/bookings", { body: {} })).rejects.toMatchObject({
      code: "slot_taken",
      message: "Someone just took that time.",
    })
  })

  it("maps unknown codes and broken bodies to internal", async () => {
    mockFetch(respond(418, { code: "teapot", message: "x" }), new Response("<html>", { status: 502 }))
    await expect(request("GET", "/x")).rejects.toMatchObject({ code: "internal" })
    await expect(request("GET", "/x")).rejects.toMatchObject({ code: "internal" })
  })

  it("explains a dropped connection kindly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))
    const error = await request("GET", "/x").catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toMatch(/internet connection/)
  })
})

describe("live availability polling", () => {
  it("sends the ETag back and reuses the last answer on 304", async () => {
    const days = [day("open", "open")]
    const fetchFn = mockFetch(
      respond(200, { pollAfterSeconds: 10, days }, { ETag: '"v1"' }),
      new Response(null, { status: 304, headers: { ETag: '"v1"' } })
    )
    expect(await livePublicApi.getAvailability()).toEqual(days)
    const second = await livePublicApi.getAvailability()
    expect(second).toEqual(days)
    const headers = fetchFn.mock.calls[1][1]?.headers as Record<string, string>
    expect(headers["If-None-Match"]).toBe('"v1"')
  })
})

describe("live session", () => {
  it("treats 401 from /auth/me as signed out", async () => {
    mockFetch(respond(401, { code: "unauthenticated", message: "Please log in to continue." }))
    await expect(liveAuthApi.getSession()).resolves.toBeNull()
  })
})

describe("lostChoice", () => {
  const start = "2026-12-04T01:00:00.000Z"
  it("is quiet while the choice is still free", () => {
    expect(lostChoice([day("open", "open")], "2026-12-03", start)).toBeNull()
    expect(lostChoice(undefined, "2026-12-03", start)).toBeNull()
  })
  it("notices a time someone else took", () => {
    expect(lostChoice([day("open", "taken")], "2026-12-03", start)).toBe("slot")
  })
  it("notices a Thursday that closed or filled up", () => {
    expect(lostChoice([day("full", "taken")], "2026-12-03", start)).toBe("day")
    expect(lostChoice([day("cancelled", "open")], "2026-12-03")).toBe("day")
    expect(lostChoice([], "2026-12-03")).toBe("day")
  })
})
