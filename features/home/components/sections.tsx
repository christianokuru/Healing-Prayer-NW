import {
  ArrowRightIcon,
  CalendarHeartIcon,
  HandHeartIcon,
  HeartHandshakeIcon,
  LockKeyholeIcon,
  MailCheckIcon,
  MapPinIcon,
  NavigationIcon,
  SparklesIcon,
  SunriseIcon,
  UsersIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { MINISTRY, SCHEDULE } from "@/lib/config/ministry"

import { PHOTOS, type Photo } from "../photos"
import { SCRIPTURE } from "../scripture"
import { Verse } from "./verse"

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-sm font-semibold tracking-[0.1em] text-rose-strong uppercase">{children}</p>
}

/** A rounded photo that fills its box, sized for the layout it sits in. */
function RoundedPhoto({ photo, className, sizes }: { photo: Photo; className?: string; sizes: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[28px] shadow-[0_30px_60px_-35px_rgba(18,35,30,0.55)] ${className ?? ""}`}>
      <Image src={photo.src} alt={photo.alt} fill sizes={sizes} className="object-cover" />
    </div>
  )
}

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="font-heading text-[34px] leading-[1.1] font-medium tracking-[-0.01em] text-[#1d2b26] md:text-[46px]">
      {children}
    </h2>
  )
}

/* ---------- What people may be carrying ---------- */

const BURDENS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: HandHeartIcon,
    title: "Waiting on healing",
    body: "Living with pain, illness or a diagnosis that weighs on you and the people you love.",
  },
  {
    icon: SunriseIcon,
    title: "Grieving or weary",
    body: "Carrying loss, anxiety or a long, hard season that has left you tired inside.",
  },
  {
    icon: HeartHandshakeIcon,
    title: "Hurting in relationships",
    body: "Hoping for peace at home, forgiveness, or restoration with someone close to you.",
  },
  {
    icon: SparklesIcon,
    title: "Longing for God's nearness",
    body: "Wanting to feel His presence again, or simply wanting someone to pray with you.",
  },
]

export function CarryingSection() {
  return (
    <section aria-labelledby="carrying-title" className="bg-cream px-5 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <Eyebrow>You are not alone</Eyebrow>
            <SectionTitle id="carrying-title">
              Is something <em className="text-rose-strong">weighing on your heart?</em>
            </SectionTitle>
            <p className="mt-5 text-lg leading-relaxed text-[#44564f]">
              Whatever you are facing, you don&apos;t have to carry it by yourself. We would be honoured to pray with
              you, and to listen.
            </p>
            <Verse verse={SCRIPTURE.near} align="left" className="mt-8 border-l-4 border-rose/40 pl-5" />
          </div>
          <RoundedPhoto
            photo={PHOTOS.comfort}
            sizes="(min-width: 768px) 560px, 100vw"
            className="aspect-[4/3] md:aspect-[5/4]"
          />
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BURDENS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-[24px] border border-sand bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
              <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-rose-soft text-rose-strong">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="font-heading text-[22px] font-medium">{title}</h3>
              <p className="mt-2 text-base leading-relaxed text-[#4a5d56]">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ---------- Scripture band ---------- */

export function ScriptureBand() {
  return (
    <section aria-label="Scripture" className="pattern-hearts px-5 py-16 md:py-20">
      <div className="mx-auto max-w-3xl rounded-[28px] bg-cream/95 px-6 py-10 shadow-[0_20px_50px_-30px_rgba(142,58,66,0.5)] md:px-14 md:py-12">
        <Verse verse={SCRIPTURE.brokenHearted} size="lg" />
      </div>
    </section>
  )
}

/* ---------- What to expect ---------- */

const STEPS = [
  {
    icon: CalendarHeartIcon,
    title: "Choose a Thursday",
    body: "Pick an open evening up to a month ahead. Just your name, email, phone and what you'd like prayer for. No account or password.",
  },
  {
    icon: MailCheckIcon,
    title: "We'll email you",
    body: "The prayer minister reviews each request personally and emails to confirm, with a reminder the day before.",
  },
  {
    icon: MapPinIcon,
    title: "Come and be welcomed",
    body: `Arrive at ${MINISTRY.location.name} a few minutes early. Someone will greet you and show you where to go.`,
  },
  {
    icon: HandHeartIcon,
    title: "Pray together",
    body: "A gentle, unhurried 30 minutes with two or three prayer ministers. Share as much or as little as you like.",
  },
]

export function ExpectSection() {
  return (
    <section id="expect" aria-labelledby="expect-title" className="scroll-mt-20 bg-white px-5 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <Eyebrow>What to expect</Eyebrow>
          <SectionTitle id="expect-title">
            Simple, <em className="text-rose-strong">gentle</em> and always free
          </SectionTitle>
          <p className="mt-5 text-lg leading-relaxed text-[#44564f]">
            There is nothing to prepare and nothing to pay. Come as you are, and we will meet you there.
          </p>
          <RoundedPhoto photo={PHOTOS.prayingHands} sizes="(min-width: 1024px) 500px, 100vw" className="mt-8 aspect-[16/10]" />
          <Verse verse={SCRIPTURE.prayOneForAnother} align="left" className="mt-8 border-l-4 border-rose/40 pl-5" />
          <Button
            nativeButton={false}
            render={<Link href="/book" />}
            size="lg"
            className="mt-10 bg-rose text-white hover:bg-rose-strong"
          >
            Book a prayer session <ArrowRightIcon aria-hidden="true" />
          </Button>
        </div>
        <ol className="relative flex flex-col gap-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex gap-5 rounded-[24px] bg-cream p-6">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-strong text-white">
                <Icon className="size-[22px]" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-primary">Step {i + 1}</p>
                <h3 className="font-heading text-[23px] font-medium">{title}</h3>
                <p className="mt-1.5 text-base leading-relaxed text-[#4a5d56]">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ---------- A safe place ---------- */

const PROMISES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: LockKeyholeIcon,
    title: "Held in confidence",
    body: "What you share stays with the prayer team and is treated with care and discretion.",
  },
  {
    icon: UsersIcon,
    title: "Everyone is welcome",
    body: "Whatever your church, background or age, there is a place for you.",
  },
  {
    icon: HeartHandshakeIcon,
    title: "No pressure",
    body: "We pray with you, never at you. You can pause or stop at any time.",
  },
  {
    icon: VideoIcon,
    title: "Too unwell to travel?",
    body: "Ask to join by Zoom when you book, and we will pray with you from home.",
  },
]

export function SafePlaceSection() {
  return (
    <section aria-labelledby="safe-title" className="bg-primary-deep px-5 py-20 text-white md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold tracking-[0.1em] text-[#f3c9c4] uppercase">A safe place</p>
          <h2 id="safe-title" className="font-heading text-[34px] leading-[1.1] font-medium md:text-[46px]">
            You will be <em className="text-[#f3c9c4]">cared for</em>, not judged
          </h2>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-[24px] bg-white/[0.07] p-6 ring-1 ring-white/10">
              <Icon className="mb-4 size-7 text-[#f3c9c4]" aria-hidden="true" />
              <h3 className="font-heading text-[22px] font-medium">{title}</h3>
              <p className="mt-2 text-base leading-relaxed text-white/80">{body}</p>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-10 max-w-2xl text-center text-[15px] leading-relaxed text-white/70">
          Prayer is offered alongside, never instead of, medical and professional care. Please keep seeing your doctor
          and care team.
        </p>
      </div>
    </section>
  )
}

/* ---------- A few more promises from scripture ---------- */

export function ScriptureTrio() {
  const verses = [SCRIPTURE.fearNot, SCRIPTURE.restore, SCRIPTURE.shepherd]
  return (
    <section aria-labelledby="promises-title" className="relative isolate overflow-hidden px-5 py-20 md:py-28">
      <Image
        src={PHOTOS.morningReading.src}
        alt=""
        fill
        sizes="100vw"
        className="-z-20 object-cover object-[center_60%]"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[rgba(29,25,22,0.45)]" />
      <div className="mx-auto mb-10 max-w-2xl text-center text-white">
        <p className="mb-3 text-sm font-semibold tracking-[0.1em] text-[#f6d6cf] uppercase">From God&apos;s word</p>
        <h2 id="promises-title" className="font-heading text-[34px] leading-[1.1] font-medium md:text-[46px]">
          Promises to <em className="text-[#f6d6cf]">hold on to</em>
        </h2>
      </div>
      <ul className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
        {verses.map((verse) => (
          <li key={verse.reference} className="rounded-[24px] bg-cream/92 p-7 backdrop-blur">
            <Verse verse={verse} align="left" />
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------- Where and when ---------- */

export function VisitSection() {
  const { location } = MINISTRY
  return (
    <section id="visit" aria-labelledby="visit-title" className="scroll-mt-20 bg-cream px-5 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <Eyebrow>Where we meet</Eyebrow>
          <SectionTitle id="visit-title">
            {SCHEDULE.weekdayName} evenings at <em className="text-rose-strong">{location.name}</em>
          </SectionTitle>
          <dl className="mt-8 flex flex-col gap-5 text-lg">
            <div>
              <dt className="text-sm font-semibold tracking-[0.06em] text-muted-foreground uppercase">Address</dt>
              <dd className="mt-1">
                {location.street}
                <br />
                {location.city}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold tracking-[0.06em] text-muted-foreground uppercase">Times</dt>
              <dd className="mt-1">
                {SCHEDULE.weekdayName}s, {SCHEDULE.hoursLabel}. Sessions begin at 7:00, 7:30, 8:00 and 8:30.
              </dd>
            </div>
          </dl>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button
              nativeButton={false}
              render={<Link href="/book" />}
              size="lg"
              className="bg-rose text-white hover:bg-rose-strong"
            >
              Book a prayer session
            </Button>
            <Button
              nativeButton={false}
              render={<a href={location.mapsUrl} target="_blank" rel="noopener noreferrer" />}
              size="lg"
              variant="outline"
              className="bg-white"
            >
              <NavigationIcon aria-hidden="true" /> Get directions
            </Button>
          </div>
        </div>
        <MapCard />
      </div>
    </section>
  )
}

function MapCard() {
  return (
    <div aria-hidden="true" className="relative overflow-hidden rounded-[32px] bg-sky shadow-[0_30px_60px_-35px_rgba(18,73,59,0.5)]">
      <svg viewBox="0 0 520 380" className="block w-full" fill="none">
        <rect width="520" height="380" fill="#e4eef3" />
        <path d="M-20 260C80 220 160 300 260 262s180-70 290-20" stroke="#c8dcea" strokeWidth="26" />
        <path d="M120 -10 170 400" stroke="#fff" strokeWidth="14" />
        <path d="M-10 120h540" stroke="#fff" strokeWidth="10" />
        <path d="M380 -10 350 400" stroke="#fff" strokeWidth="10" />
        <rect x="200" y="150" width="120" height="70" rx="12" fill="#cfe0d6" />
        <rect x="410" y="170" width="80" height="54" rx="10" fill="#d8e5ee" />
        <rect x="30" y="160" width="70" height="60" rx="10" fill="#d8e5ee" />
        <circle cx="260" cy="150" r="54" fill="#b4535b" opacity="0.12" />
      </svg>
      <span className="absolute top-[34%] left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 -rotate-45 items-center justify-center rounded-[50%_50%_50%_0] bg-rose shadow-[0_10px_24px_rgba(142,58,66,0.4)]">
        <span className="size-4 rounded-full bg-white" />
      </span>
      <p className="absolute right-4 bottom-4 left-4 rounded-2xl bg-white/90 px-4 py-3 text-[15px] font-semibold text-[#1d2b26] backdrop-blur">
        {MINISTRY.location.name} · Calgary
      </p>
    </div>
  )
}

/* ---------- Closing invitation ---------- */

export function ClosingInvitation() {
  return (
    <section aria-labelledby="closing-title" className="relative overflow-hidden bg-rose-soft px-5 py-20 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="closing-title" className="font-heading text-[36px] leading-[1.1] font-medium md:text-[50px]">
          There is a place for you <em className="text-rose-strong">this Thursday</em>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[#44564f]">
          Booking takes a couple of minutes and needs no account. If you have any questions first, we would love to hear
          from you.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            nativeButton={false}
            render={<Link href="/book" />}
            size="lg"
            className="bg-rose px-8 text-white hover:bg-rose-strong"
          >
            Book a prayer session <ArrowRightIcon aria-hidden="true" />
          </Button>
          <Button
            nativeButton={false}
            render={<a href={`mailto:${MINISTRY.contactEmail}`} />}
            size="lg"
            variant="outline"
            className="bg-white"
          >
            Email us a question
          </Button>
        </div>
      </div>
    </section>
  )
}
