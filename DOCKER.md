# Running the site with Docker

A short guide for running Healing Prayer Northwest on your own computer.
Run every command from the project folder (the one with `compose.yaml` in it):

```bash
cd ~/Desktop/Web-Dev/Next/healing-prayer-northwest
```

## The words you'll see

- **Image**: a ready-made package of software. We have three:
  `healing-prayer-nw/web` (the website), `healing-prayer-nw/backend` (the API and email worker)
  and `postgres:16-alpine` (the database).
- **Container**: an image that is running. Each part of the site runs in its own container.
- **Volume**: where the database keeps its data (`healing-prayer-nw_db-data`). It survives
  stopping, restarting and rebuilding. Only `down -v` deletes it.
- **compose.yaml**: the list of containers and how they connect. `docker compose` reads it.
- **`--profile app`**: means "the whole site". Without it, only the database starts.

## Start the whole site

```bash
docker compose --profile app up -d
```

- `up` starts the containers, `-d` runs them in the background so you get your terminal back.
- Wait about 30 seconds, then open <http://localhost:3000>.
- Admin login: <http://localhost:3000/login> with `janis@example.com` / `admin-demo-1`.

Containers that were running when you shut the computer down start again on their own
(Docker starts at boot), so after a reboot the site is usually already up.

## Check it's running

```bash
docker compose --profile app ps
```

What you should see:

| Name | Status | Meaning |
| --- | --- | --- |
| `db` | Up (healthy) | the database |
| `api` | Up (healthy) | the backend |
| `worker` | Up | sends emails |
| `web` | Up (healthy) | the website |

`migrate` only shows with `ps -a`: it runs once at start to prepare the database, then stops.
"Exited (0)" means it finished fine. "(starting)" means wait a few more seconds.

## See the emails

No real email is sent on your computer. The worker prints each email instead,
including the visitors' "manage my booking" links:

```bash
docker compose logs -f worker
```

`-f` keeps following new lines. Press `Ctrl+C` to stop watching (the worker keeps running).

## Something looks wrong?

See what a container said (replace `web` with `api`, `worker`, `db` or `migrate`):

```bash
docker compose logs --tail 50 web
```

Restart one container:

```bash
docker compose restart api
```

## Stop the site

```bash
docker compose --profile app down
```

This stops and removes the containers. Your data stays in the volume: the next `up`
brings everything back as you left it.

## After changing the code

The containers run a copy of the code baked into the images, so rebuild after changes:

```bash
docker compose --profile app up -d --build
```

Only the parts that changed are rebuilt. The first build is slow; later ones are quick.

## Start again with an empty database

**This deletes every booking, person and note. It cannot be undone.**

```bash
docker compose --profile app down -v
docker compose --profile app up -d
```

`-v` removes the volume. On the next start, the tables and the demo login are created again.

## Everyday coding (faster)

For working on the code, run only the database in Docker and the rest directly,
so changes show up instantly:

```bash
docker compose up -d                       # database only
cd backend && uv run fastapi dev           # terminal 2: the API
cd backend && uv run python -m app.worker  # terminal 3: emails
npm run dev                                # terminal 4: the website
```

Don't run this and the full Docker site at the same time: they use the same ports
(3000 for the website, 5433 for the database).

## Cheat sheet

| I want to… | Command |
| --- | --- |
| start the whole site | `docker compose --profile app up -d` |
| see what's running | `docker compose --profile app ps` |
| see the emails | `docker compose logs -f worker` |
| see errors | `docker compose logs --tail 50 web` |
| restart one part | `docker compose restart api` |
| stop everything (keep data) | `docker compose --profile app down` |
| rebuild after code changes | `docker compose --profile app up -d --build` |
| wipe the database | `docker compose --profile app down -v` |
| see images and space used | `docker images` and `docker system df` |
