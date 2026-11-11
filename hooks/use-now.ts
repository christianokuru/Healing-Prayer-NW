"use client"

import { useSyncExternalStore } from "react"

/**
 * One shared clock for the whole app, ticking once a minute so time-based
 * states ("in 2 days", "booking closed") stay correct on long-open screens.
 *
 * During prerendering there is no "now": the server snapshot is a fixed
 * epoch, and only time-independent shells are prerendered anyway.
 */
const TICK_MS = 60_000
const SERVER_NOW = new Date(0)

let current: Date | null = null
let timer: ReturnType<typeof setInterval> | undefined
const listeners = new Set<() => void>()

function tick() {
  current = new Date()
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    // Catch up immediately if the tab was idle with no subscribers.
    if (current && Date.now() - current.getTime() >= TICK_MS) tick()
    timer = setInterval(tick, TICK_MS)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

const getSnapshot = () => (current ??= new Date())
const getServerSnapshot = () => SERVER_NOW

export function useNow(): Date {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
