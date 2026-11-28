# Healing Prayer Northwest

Booking platform for free, 30-minute prayer sessions (Thursdays, 7–9 pm, Calgary).
Visitors book **without an account** (many are elderly): name, email, phone, prayer points, date and time.
Everything after that happens by email, and each email carries a private "manage my booking" link.
Only the prayer minister signs in.

- **Frontend:** this folder (Next.js 16 + shadcn/ui). Until it is connected to the API, it runs against a
  **mock API in the browser**, so every screen works end to end.
- **Backend:** [`backend/`](backend/README.md) (FastAPI + PostgreSQL).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production build
npm test           # unit tests (booking rules, wizard, Calgary time, redirects, follow-ups)
npm run lint
npm run typecheck
```

### Demo (mock mode only)

- **Visitors:** just book at `/`. No email is really sent, so the success page links straight to the
  manage page the email would open.
- **Prayer minister:** `/login` with `janis@example.com` / `admin-demo-1` (one-tap button on the page).

Demo data lives in the browser's `localStorage`; **Account menu → Reset demo data** starts fresh.

## What's built

- **Public booking** (`/`): Thursday → time → details (name, email, phone, prayer points, optional
  "join by Zoom" with a reason) → review. Hidden honeypot field for bots. No account.
- **Manage my booking** (`/manage/[token]`, the private link in every email): status, Zoom link once
  approved, add to calendar, directions, cancel / withdraw (48 h+), "I can't make it" (< 48 h). No rescheduling:
  cancel and book again.
- **Privacy notice** (`/privacy`): plain-language draft for the ministry to review (`PRIVACY` in `lib/config/ministry.ts`).
- **Prayer minister login:** log in, forgot / reset password.
- **Admin:** overview (requests sorted by urgency with tap-to-call / email, approve / decline with Undo, Zoom link required
  for online), attendance (mark who came and who didn't, with Undo; email anyone who didn't come a personal
  follow-up, from a kind editable draft), calendar, history (search, ranges, spreadsheet export, per-person history),
  notes (dated, searchable, optionally about a person and shown on their history), analytics.
- **PWA:** manifest, icons, install prompt (Android) and Add-to-Home-Screen guide (iPhone). There is no offline mode: the old service worker was removed, and `public/sw.js` is now a kill switch that unregisters it on phones that still have it.
- Mobile-first: bottom tab bars on phones, 44 px+ touch targets, safe-area aware. Lenis smooth scrolling on wheel/trackpad (native on touch, off for reduced motion).

## Booking rules (enforced in `lib/domain/booking-rules.ts`)

- Sessions: Thursdays 7:00, 7:30, 8:00, 8:30 pm Calgary time (`lib/config/ministry.ts`).
- Book from 48 hours to 1 month ahead; one booking per person (email address) per Thursday.
- Every request needs approval; a pending request holds its slot.
- Visitors can cancel from their link up to 48 h before; inside 48 h they can say they can't come.
- Cancelling a Thursday cancels its active bookings (visitors are emailed by the backend).

All times are stored in UTC and shown in `America/Edmonton` using the IANA zone, so offset changes are handled automatically
(note: tzdata 2026e has Alberta on UTC-6 all year from 2026).

## Architecture

```
app/                 Routes only (thin). (public)/ (booking, manage, privacy), (auth)/, admin/, manifest
features/            One folder per feature: components + hooks + pure logic
  public/  booking/  manage/  auth/  admin/  pwa/
components/          Shared UI: ui/ (shadcn), common/, forms/, layout/, brand/, providers/
lib/
  config/            Ministry constants (schedule, address, limits)
  domain/            Types, booking rules, Calgary time — pure and unit-tested
  api/contracts.ts   The API interfaces the UI depends on
  api/mock/          Browser mock implementation (the only thing to replace)
  query/keys.ts      TanStack Query keys
proxy.ts             Keeps /admin behind the minister's login (role cookie)
public/sw.js         Removes the old service worker (keep for a few months)
```

- **Dependency inversion:** components call hooks → hooks call `useApi()` → an `Api` implementation. Swapping mock for live touches no UI.
- **Data:** TanStack Query with optimistic updates for admin decisions and consistent invalidation.
- **Rendering:** every route prerenders a static shell (Cache Components), and data streams in on the client, so navigation is instant.
- **Errors:** every adapter throws `ApiError { code, message }`, which matches the agreed single error format.

## Connecting the FastAPI backend

1. Create `lib/api/live/` implementing `AuthApi`, `VisitorApi` and `AdminApi` from `lib/api/contracts.ts`.
   Call Next.js route handlers (e.g. `app/api/[...path]/route.ts`) that forward the FastAPI **session cookie**, so the browser never talks to FastAPI directly.
2. Generate types from FastAPI's OpenAPI spec (e.g. `openapi-typescript`) and map them to `lib/domain/types.ts`.
3. On login, set the httpOnly session cookie **and** the non-sensitive `hpn_role` cookie (`lib/auth/session-cookie.ts`) that `proxy.ts` reads.
4. Set `NEXT_PUBLIC_API_MODE=live` and point `defaultApi` in `lib/api/index.ts` at the live adapter.
5. Map backend error codes to `ApiErrorCode` (`slot_taken`, `one_per_thursday`, …) so the UI messages keep working.

## Waiting on the client

- Public pages (home, about, etc.) — for now `proxy.ts` sends `/` to `/login`, or to the dashboard when signed in.
- Privacy notice and booking terms (`app/(auth)/privacy/page.tsx` is a placeholder).
- Contact email (`MINISTRY.contactEmail`).
- Brown dark mode (planned).
