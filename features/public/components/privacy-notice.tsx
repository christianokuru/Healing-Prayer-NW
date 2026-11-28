import type { ReactNode } from "react"

import { MINISTRY, PRIVACY } from "@/lib/config/ministry"

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-[24px] leading-tight font-medium">{title}</h2>
      {children}
    </section>
  )
}

const contact = (
  <a href={`mailto:${MINISTRY.contactEmail}`} className="font-semibold text-primary-strong underline">
    {MINISTRY.contactEmail}
  </a>
)

/**
 * Plain-language privacy notice for visitors. Written as a draft for the
 * ministry to review; it is not legal advice.
 */
export function PrivacyNotice() {
  return (
    <article className="mx-auto flex max-w-2xl animate-rise flex-col gap-8 text-[17px] leading-relaxed text-[#2c3f38]">
      <header>
        <h1 className="font-heading text-[34px] leading-tight font-medium md:text-[40px]">Privacy notice</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Last updated {PRIVACY.lastUpdated}
        </p>
        {!PRIVACY.reviewed && (
          <p className="mt-4 rounded-xl bg-warning-soft px-4 py-3 text-base text-warning-foreground">
            This notice is waiting for a final review by {MINISTRY.name}.
          </p>
        )}
      </header>

      <p>
        {MINISTRY.name} is a prayer ministry that meets on Thursday evenings at {MINISTRY.location.name} in Calgary. We
        take the trust you place in us seriously. This notice explains, in plain words, what we collect when you book a
        prayer session, why, and what you can ask us to do with it.
      </p>

      <Section title="What we collect">
        <ul className="flex list-disc flex-col gap-1.5 pl-6">
          <li>Your name, email address and phone number.</li>
          <li>What you&apos;d like prayer for (your prayer points).</li>
          <li>If you ask to join by Zoom, the short reason you give.</li>
          <li>The session you booked, and whether you came.</li>
          <li>Brief private notes the prayer minister may keep to help care for you in future sessions.</li>
        </ul>
        <p>We don&apos;t ask for your date of birth, address or any payment details. Sessions are always free.</p>
      </Section>

      <Section title="Why we collect it">
        <ul className="flex list-disc flex-col gap-1.5 pl-6">
          <li>To arrange your session and keep your time for you.</li>
          <li>To email you about it: confirmation, a reminder the day before, and any changes.</li>
          <li>To contact you if something changes, or to check on you if you missed a session.</li>
          <li>So the prayer ministers can prepare to pray with you.</li>
          <li>To understand, in general numbers only, how many people the ministry serves.</li>
        </ul>
        <p>We never sell your information, and we never use it for advertising or fundraising emails.</p>
      </Section>

      <Section title="Your prayer points are sensitive">
        <p>
          Prayer points often include health, family or personal matters. Please share only what you are comfortable
          with. You can always say more in person, or nothing at all.
        </p>
      </Section>

      <Section title="Who can see your information">
        <p>
          Only the prayer ministry team who run the sessions. Your details are not shared with {MINISTRY.location.name}
          or anyone else, except:
        </p>
        <ul className="flex list-disc flex-col gap-1.5 pl-6">
          <li>
            Companies that help us run this website and send its emails, who may store it only to provide that service.
          </li>
          <li>When the law requires it, or if we believe someone&apos;s safety is at serious risk.</li>
        </ul>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your bookings and notes so the ministry can remember what you&apos;ve asked prayer for over time. You
          can ask us to delete your information at any time, and we will.
        </p>
      </Section>

      <Section title="Your choices">
        <p>You can ask us to:</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-6">
          <li>show you the information we hold about you,</li>
          <li>correct anything that&apos;s wrong,</li>
          <li>delete your information, or</li>
          <li>stop contacting you.</li>
        </ul>
        <p>Just email {contact}. You can cancel a booking yourself using the link in your emails.</p>
      </Section>

      <Section title="Keeping it safe">
        <p>
          Your information is stored on secure servers and sent over encrypted connections. Only the prayer minister
          can sign in to see bookings. The private link in your emails lets anyone who has it see that one booking, so
          please don&apos;t forward those emails.
        </p>
      </Section>

      <Section title="Prayer is not medical care">
        <p>
          Prayer sessions are not a replacement for medical, psychological or other professional care. Please keep
          seeing your doctor or care team. If you are in immediate danger, call 911. For crisis support, call or text
          9-8-8.
        </p>
      </Section>

      <Section title="Questions or changes">
        <p>
          If you have any questions about this notice or your information, email {contact}. If we change this notice,
          we&apos;ll update the date at the top of this page.
        </p>
      </Section>
    </article>
  )
}
