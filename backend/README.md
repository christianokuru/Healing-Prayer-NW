# Healing Prayer Northwest API

FastAPI + SQLModel + PostgreSQL, implementing the backend handoff spec.

## Run it

Needs [uv](https://docs.astral.sh/uv/) and Docker. From this folder:

```bash
cp .env.example .env
docker compose up -d --wait
uv sync
uv run alembic upgrade head
uv run python -m app.seed        # demo accounts, development only
uv run fastapi dev               # http://127.0.0.1:8000, docs at /docs
uv run python -m app.worker      # separate terminal: emails and daily jobs
```

### Without Docker (PostgreSQL installed on the machine)

One-time setup, no `sudo` needed. The database lives in `~/.local/share/healing-prayer-nw`
on port 5433, separate from any system PostgreSQL:

```bash
D=~/.local/share/healing-prayer-nw && mkdir -p $D
/usr/lib/postgresql/17/bin/initdb -D $D/postgres -U hpn --auth=scram-sha-256 --pwprompt
scripts/local-db.sh start
psql -h 127.0.0.1 -p 5433 -U hpn -d postgres -c "CREATE DATABASE hpn;" -c "CREATE DATABASE hpn_test;"
cp .env.example .env   # then set DATABASE_URL and TEST_DATABASE_URL with that password
uv sync && uv run alembic upgrade head && uv run python -m app.seed
```

Every time, in three terminals (plus `scripts/local-db.sh start` after a reboot):

```bash
uv run fastapi dev                # backend/   API on :8000
uv run python -m app.worker       # backend/   emails, printed here
npm run dev                       # repo root  website on :3000 (live mode, see the root README)
```

Stop the database with `scripts/local-db.sh stop`.

Without `SMTP_HOST` the worker prints emails, including visitors' manage links. To see real
emails (with the calendar attachment), point it at a local mail catcher such as Mailpit:
`SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_SECURITY=none` (development only).

Tests never read your `.env`.

Checks: `uv run pytest`, `uv run ruff check .`, `uv run ty check`. Tests use (and wipe)
a separate `hpn_test` database; set it with `TEST_DATABASE_URL` (in the environment or `.env`).

## For the frontend

| Question | Answer |
| --- | --- |
| Development base URL | `http://127.0.0.1:8000` (no path prefix) |
| OpenAPI | `/openapi.json` |
| Field names | camelCase; optional booking fields are `null` when empty |
| Session cookie | `hpn_session` |
| Demo login | `janis@example.com` / `admin-demo-1` (the prayer minister; visitors have no accounts) |

### Polling for slots

`GET /availability/slots` (public; optional `date`) returns
`{ pollAfterSeconds, days: [{ date, state, openCount, slots }] }`. Wait
`pollAfterSeconds`, then send the last `ETag` as `If-None-Match`; a 304 means nothing
changed. On 429, wait for `Retry-After`. Stop polling while the tab is hidden. The result
is informational: `POST /bookings` still checks the slot and can return `slot_taken`.

Beyond the spec's error codes:

- `rate_limited` (429) and `internal` (500) can be returned by any endpoint.
- A body over 64 KB gets a plain-text 413 and an unknown `Host` a plain-text 400, the
  only errors outside the shared shape.

## Visitors have no accounts

- `POST /bookings` takes `fullName`, `email`, `phone`, `prayerPoints`, `slotStart`, and optional
  `online` + `onlineReason`. People are recognised by email (stored lower-case); their latest name
  and phone are kept. One active booking per email per Thursday, enforced by a unique index.
- The response and every visitor email include a private token for `/manage/{token}`
  (view, `cancel`, `late-notice`). The token is the booking ID plus an HMAC signature with
  `SECRET_KEY`, so nothing is stored and it can't be forged; rotating the key invalidates every link.
- A hidden `website` field is a honeypot: if filled in, the request is refused without saying why.
- Bookings are rate-limited per IP and per email.

## Decisions where the spec was open

- `returningPeople`: prayed for in the range and completed at least two sessions overall.
- `frequent`: statistics are for the selected range. `attendanceRate` is 0 with no data.
- Attendance: `PUT /admin/bookings/{id}/attendance` with `{ "attendance": "attended" | "no_show" | null }`,
  allowed from the session's start on confirmed, attended or no-show bookings (`null` clears it). Only
  `attended` counts as held (visits, frequent, `sessionsHeld`); started but unmarked
  sessions are reported as `unmarked`. Marking attendance sends no email.
- Follow-up: `POST /admin/bookings/{id}/follow-up` `{ subject, message }` sends the minister's own words
  to someone marked `no_show` and records `followUpSentAt`.
- `/admin/bookings`: `from` is inclusive, `to` exclusive.
- Slots outside the booking window are shown as `taken`.
- Undoing a decline is refused (`invalid_state`) if the slot was taken since, the Thursday was
  cancelled, or the person has booked that Thursday again.
- Resetting a password by email also confirms the email, and signs out every device.

## How it fits together

```
app/routers/    HTTP only          app/services/   rules and queries
app/models.py   tables             app/schemas.py  JSON in and out
app/schedule.py Calgary time       app/errors.py   the error format
app/emails.py   queues emails      app/worker.py   sends them, daily jobs
```

- **Double booking:** booking changes run one at a time (a PostgreSQL advisory lock), and
  partial unique indexes back that up.
- **Emails** are saved in the same transaction as the change. Approval, decline and
  no-show emails wait 10 seconds, so Undo withdraws them; a no-show email that already went
  out is never sent again. Delivery is at least once.
- **Privacy:** prayer points never reach emails or logs; sessions, codes and tokens are
  stored hashed; sent email bodies are cleared.

## Security measures

- Every visitor query is scoped to the signed-in person; slots show only `open`, `taken`
  or `mine`, never who holds them.
- Limits on sign-up, login, codes, resets, booking and polling, with `Retry-After`.
- Writes from another `Origin` than `FRONTEND_URL` are refused (CSRF). The Next.js server
  may forward the browser's `Origin`, or send none.
- Unknown `Host` headers are refused; responses are `no-store` with strict headers (HSTS
  in production); `/docs` is off in production.
- Parameterised SQL, strict input types and sizes, no response field outside its schema.

## Production

- Set every variable in `.env.example`, with `ENVIRONMENT=production`,
  `COOKIE_SECURE=true`, SMTP (`SMTP_SECURITY=starttls` or `ssl`), `EMAIL_REPLY_TO` (the
  ministry's inbox, so visitors' replies reach a person) and a random `SECRET_KEY`.
- `uv run alembic upgrade head`, then `uv run fastapi run` and `uv run python -m app.worker`.
- Create the admin with `uv run python -m app.seed --admin`.
- Rate limits use the client IP. The Next.js `/api` bridge forwards `X-Forwarded-For`; set
  `FORWARDED_ALLOW_IPS` (or `--forwarded-allow-ips`) to the Next.js server's address, or all
  visitors share one IP allowance.
