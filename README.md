# Healing Prayer Northwest — frontend

Booking platform for free, 30-minute prayer sessions (Thursdays, 7–9 pm, Calgary).
This repo is the **frontend only** (Next.js 16 + shadcn/ui). The API and database are built separately in FastAPI.
Until that API is ready, everything runs against a **mock API in the browser**, so every screen works end to end.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production build (service worker / PWA only runs here)
npm test           # unit tests (booking rules, wizard, Calgary time, redirects)
npm run lint
npm run typecheck
```

### Demo accounts (mock mode only)

| Role | Email | Password |
| --- | --- | --- |
| Visitor | `grace@example.com` | `prayer-demo-1` |
| Prayer minister (admin) | `janis@example.com` | `admin-demo-1` |

The login page has one-tap buttons for both. The email-confirmation code in mock mode is `123456`.
Demo data lives in the browser's `localStorage`; **Account menu → Reset demo data** starts fresh.

## What's built

- **Auth:** log in, sign up, confirm email (6-digit code), forgot / reset password, profile and password change.
- **Visitor:** home with next session, 4-step booking (Thursday → time → prayer points → review), reschedule (needs re-approval), withdraw / cancel (48 h+), "Can't make it?" late notice (< 48 h), add to calendar (.ics), directions, Zoom link once approved.
- **Admin:** overview (requests sorted by urgency, approve / decline with Undo, Zoom link required for online), calendar (tap a Thursday, approve, mark no-show, cancel or restore a Thursday), history (search, ranges, spreadsheet export, per-person prayer history), analytics.
- **PWA:** manifest, icons, service worker with offline page, install prompt (Android) and Add-to-Home-Screen guide (iPhone).
- Mobile-first: bottom tab bars on phones, 44 px+ touch targets, safe-area aware. Lenis smooth scrolling on wheel/trackpad (native on touch, off for reduced motion).

## Booking rules (enforced in `lib/domain/booking-rules.ts`)

- Sessions: Thursdays 7:00, 7:30, 8:00, 8:30 pm Calgary time (`lib/config/ministry.ts`).
- Book from 48 hours to 1 month ahead; one booking per person per Thursday.
- Every request needs approval; a pending request holds its slot.
- Visitors can change or cancel up to 48 h before. Reschedules keep the original until the new time is approved.
- Cancelling a Thursday cancels its active bookings (visitors are emailed by the backend).

All times are stored in UTC and shown in `America/Edmonton` using the IANA zone, so offset changes are handled automatically
(note: tzdata 2026e has Alberta on UTC-6 all year from 2026).

## Architecture

```
app/                 Routes only (thin). (auth)/, dashboard/, admin/, offline, manifest
features/            One folder per feature: components + hooks + pure logic
  auth/  booking/  visitor/  admin/  pwa/
components/          Shared UI: ui/ (shadcn), common/, forms/, layout/, brand/, providers/
lib/
  config/            Ministry constants (schedule, address, limits)
  domain/            Types, booking rules, Calgary time — pure and unit-tested
  api/contracts.ts   The API interfaces the UI depends on
  api/mock/          Browser mock implementation (the only thing to replace)
  query/keys.ts      TanStack Query keys
proxy.ts             Optimistic route guard (role cookie)
public/sw.js         Service worker
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

- Public pages (home, about, etc.) — `/` currently redirects to `/login`.
- Privacy notice and booking terms (`app/(auth)/privacy/page.tsx` is a placeholder).
- Contact email (`MINISTRY.contactEmail`).
- Brown dark mode (planned).
