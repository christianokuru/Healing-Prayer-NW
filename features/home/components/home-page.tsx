import { Hero } from "./hero"
import {
  CarryingSection,
  ClosingInvitation,
  ExpectSection,
  SafePlaceSection,
  ScriptureBand,
  ScriptureTrio,
  VisitSection,
} from "./sections"

/**
 * The public welcome: speaks to what people carry, explains gently what
 * happens and why it's safe, and invites them to book. Scripture throughout.
 */
export function HomePage() {
  return (
    <>
      <Hero />
      <CarryingSection />
      <ScriptureBand />
      <ExpectSection />
      <SafePlaceSection />
      <ScriptureTrio />
      <VisitSection />
      <ClosingInvitation />
    </>
  )
}
