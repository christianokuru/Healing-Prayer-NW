import type { Metadata } from "next"

import { HomePage } from "@/features/home/components/home-page"

export const metadata: Metadata = {
  title: { absolute: "Healing Prayer Northwest · Free healing prayer in Calgary" },
  description:
    "Free, 30-minute healing prayer sessions every Thursday evening at Alberta Bible College, Calgary. Come as you are and be prayed for.",
}

export default function Page() {
  return <HomePage />
}
