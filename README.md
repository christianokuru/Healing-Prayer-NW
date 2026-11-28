# Healing Prayer Northwest

Booking platform for free, 30-minute prayer sessions (Thursdays, 7–9 pm, Calgary).
Visitors book **without an account** (many are elderly): name, email, phone, prayer points, date and time.
Everything after that happens by email, and each email carries a private "manage my booking" link.
Only the prayer minister signs in.

- **Frontend:** this folder (Next.js 16 + shadcn/ui). It runs in one of two modes:
  - **mock** (default): demo data kept in the browser, no backend needed.
  - **live**: the real FastAPI backend, reached through this site's `/api` bridge.
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

### Everything in Docker (one command)

`compose.yaml` at the root runs each part in its own container: database, API, email worker
and website. One-time: `cp backend/.env.example backend/.env` (it holds the backend's settings).

```bash
docker compose --profile app up -d --build   # build and start everything: http://localhost:3000
docker compose --profile app ps              # what's running, and whether it's healthy
docker compose logs -f worker                # the emails the worker "sends" (printed in development)
docker compose --profile app down            # stop everything (data is kept)
```

The first run creates the tables and the demo login `janis@example.com` / `admin-demo-1`.
`docker compose up -d` (without `--profile app`) starts only the database, for the setup below.
While the full stack is up, don't also run `npm run dev` or `uv run fastapi dev`: they use the same ports.

### Live mode (with the backend)

1. Start the backend, its database and the email worker (see [`backend/README.md`](backend/README.md)).
2. `cp .env.example .env.local` and set `NEXT_PUBLIC_API_MODE=live` (and `API_URL` if FastAPI isn't on `127.0.0.1:8000`).
3. Set the backend's `FRONTEND_URL` to this site's exact origin (for example `http://localhost:3000`).
   The API refuses writes from any other origin.
4. `npm run dev`. Create the minister's login with the backend's seed script.

`NEXT_PUBLIC_API_MODE` is read at build time, so rebuild after changing it.

### Demo (mock mode only)

- **Visitors:** just book at `/book`. No email is really sent, so the success page links straight to the
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
  api/mock/          Browser mock implementation (demo mode)
  api/live/          Calls FastAPI through /api (live mode)
app/api/[...path]/   Same-origin bridge to FastAPI
  query/keys.ts      TanStack Query keys
proxy.ts             Keeps /admin behind the minister's login (role cookie)
public/sw.js         Removes the old service worker (keep for a few months)
```

- **Dependency inversion:** components call hooks → hooks call `useApi()` → an `Api` implementation. Swapping mock for live touches no UI.
- **Data:** TanStack Query with optimistic updates for admin decisions and consistent invalidation.
- **Rendering:** every route prerenders a static shell (Cache Components), and data streams in on the client, so navigation is instant.
- **Errors:** every adapter throws `ApiError { code, message }`, which matches the agreed single error format.

## How the frontend reaches the API (live mode)

- The browser only talks to this site. `app/api/[...path]/route.ts` forwards `/api/*` to FastAPI (`API_URL`),
  so the httpOnly session cookie stays first-party and no CORS is needed.
- The bridge only forwards the API's own areas (`auth`, `availability`, `bookings`, `manage`, `admin`), only the
  session cookie and a few headers, caps bodies at 64 KB, and passes the visitor's IP on in `X-Forwarded-For`.
- **Production:** the proxy in front of Next.js (Vercel, or Caddy/nginx on the VPS) must *replace*
  `X-Forwarded-For` with the visitor's IP rather than trust what the browser sent (Caddy and Vercel do this by
  default). Run FastAPI with `--forwarded-allow-ips` set to the Next.js server's address, so the rate limits
  see each visitor separately.
- The booking page re-checks free times every 10 seconds (`SCHEDULE.slotPollSeconds`) using the API's ETag,
  so unchanged answers cost almost nothing. If someone else takes the chosen time, the visitor is told kindly
  and keeps what they typed.
- Login sets FastAPI's httpOnly cookie plus the small `hpn_role` hint cookie that `proxy.ts` reads.
  Real authorization always happens in the API.

## Waiting on the client

- Janis reviews the privacy notice wording, then set `PRIVACY.reviewed: true` (`lib/config/ministry.ts`).
- The ministry's real contact email: `MINISTRY.contactEmail` here and `EMAIL_REPLY_TO` in the backend.
