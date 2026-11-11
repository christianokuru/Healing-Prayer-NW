"use client"

import { createContext, use, type ReactNode } from "react"

import { defaultApi, type Api } from "@/lib/api"

const ApiContext = createContext<Api>(defaultApi)

/** Lets tests or the live adapter swap the API without touching features. */
export function ApiProvider({ api = defaultApi, children }: { api?: Api; children: ReactNode }) {
  return <ApiContext value={api}>{children}</ApiContext>
}

export const useApi = () => use(ApiContext)
