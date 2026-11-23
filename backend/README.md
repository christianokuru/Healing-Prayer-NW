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

Without `SMTP_HOST` the worker prints emails, including verification codes.

Checks: `uv run pytest`, `uv run ruff check .`, `uv run ty check`. Tests use (and wipe)
a separate `hpn_test` database; override it with `TEST_DATABASE_URL`.

## For the frontend

| Question | Answer |
| --- | --- |
| Development base URL | `http://127.0.0.1:8000` (no path prefix) |
| OpenAPI | `/openapi.json` |
| Field names | camelCase; optional booking fields are `null` when empty |
| Session cookie | `hpn_session` |
| Demo accounts | `janis@example.com` / `admin-demo-1`, `grace@example.com` / `prayer-demo-1` |

### Polling for slots

`GET /availability/slots` (visitor session; optional `date`, `excludeBookingId`) returns
`{ pollAfterSeconds, days: [{ date, state, openCount, slots }] }`. Wait
`pollAfterSeconds`, then send the last `ETag` as `If-None-Match`; a 304 means nothing
changed. On 429, wait for `Retry-After`. Stop polling while the tab is hidden. The result
is informational: `POST /bookings` still checks the slot and can return `slot_taken`.

Beyond the spec's error codes:

- `rate_limited` (429) and `internal` (500) can be returned by any endpoint.
- A body over 64 KB gets a plain-text 413 and an unknown `Host` a plain-text 400, the
  only errors outside the shared shape.

## Decisions where the spec was open

- `returningPeople`: prayed for in the range and completed at least two sessions overall.
- `frequent`: statistics are for the selected range. `attendanceRate` is 0 with no data.
- `/admin/bookings`: `from` is inclusive, `to` exclusive.
- Slots outside the booking window are shown as `taken`.
- Undoing a decision is refused (`invalid_state`) if the slot was taken since, the
  Thursday was cancelled, or the visitor has asked to move that session.
- Approving a reschedule after the original session took place keeps the original as held.
- A late notice leaves a pending reschedule request in place.
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
  no-show emails wait 10 seconds, so Undo withdraws them. Delivery is at least once.
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
  `COOKIE_SECURE=true`, SMTP (STARTTLS) and a random `SECRET_KEY`.
- `uv run alembic upgrade head`, then `uv run fastapi run` and `uv run python -m app.worker`.
- Create the admin with `uv run python -m app.seed --admin`.
- Rate limits use the client IP. Have Next.js forward `X-Forwarded-For` and set
  `FORWARDED_ALLOW_IPS` to its address, or all visitors share one IP allowance.
