import { ArrowRightIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { MINISTRY, SCHEDULE } from "@/lib/config/ministry"

import { PHOTOS } from "../photos"
import { SCRIPTURE } from "../scripture"
import { Verse } from "./verse"

/** First thing anyone sees: a warm welcome, one clear invitation, and Matthew 11:28. */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <Image
        src={PHOTOS.hero.src}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[center_65%]"
      />
      {/* A soft cream wash keeps the words easy to read over the morning light. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(252,248,242,0.94)_0%,rgba(252,248,242,0.82)_42%,rgba(252,248,242,0.38)_78%,rgba(252,248,242,0.9)_100%)]"
      />
      <div className="mx-auto flex max-w-4xl flex-col items-center px-5 pt-14 pb-20 text-center md:pt-24 md:pb-28">
        <p className="mb-5 rounded-full bg-white/70 px-4 py-1.5 text-sm font-semibold tracking-[0.08em] text-primary-strong uppercase backdrop-blur">
          {MINISTRY.tagline}
        </p>
        <h1
          id="hero-title"
          className="font-heading text-[42px] leading-[1.05] font-medium tracking-[-0.02em] text-[#1d2b26] md:text-[68px]"
        >
          Come as you are, <em className="text-rose-strong">and be prayed for.</em>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#3d4d47] md:text-xl">
          Free, 30-minute healing prayer sessions every {SCHEDULE.weekdayName} evening at {MINISTRY.location.name}. A
          small, caring team will listen and pray with you, gently and in confidence.
        </p>
        <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Button
            nativeButton={false}
            render={<Link href="/book" />}
            size="lg"
            className="bg-rose px-8 text-white shadow-[0_10px_30px_-10px_rgba(142,58,66,0.6)] hover:bg-rose-strong"
          >
            Book a prayer session <ArrowRightIcon aria-hidden="true" />
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="#expect" />}
            size="lg"
            variant="outline"
            className="border-white/80 bg-white/70 backdrop-blur hover:bg-white"
          >
            What to expect
          </Button>
        </div>
        <Verse
          verse={SCRIPTURE.welcome}
          className="mt-14 max-w-xl rounded-3xl bg-white/75 px-6 py-6 shadow-[0_20px_50px_-30px_rgba(18,35,30,0.45)] backdrop-blur-md"
        />
      </div>
    </section>
  )
}
