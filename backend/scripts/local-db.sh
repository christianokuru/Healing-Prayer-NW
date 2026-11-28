#!/usr/bin/env bash
# Local PostgreSQL for development, without Docker or sudo.
# Data lives in $HPN_DB_DIR (default ~/.local/share/healing-prayer-nw), on port 5433.
#
#   scripts/local-db.sh start | stop | status
set -euo pipefail

DIR="${HPN_DB_DIR:-$HOME/.local/share/healing-prayer-nw}"
PORT="${HPN_DB_PORT:-5433}"
BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
[ -x "$BIN/pg_ctl" ] || { echo "PostgreSQL server binaries not found in /usr/lib/postgresql" >&2; exit 1; }
[ -d "$DIR/postgres" ] || { echo "No database in $DIR/postgres yet (see backend/README.md)." >&2; exit 1; }

case "${1:-status}" in
  start)
    "$BIN/pg_ctl" -D "$DIR/postgres" -l "$DIR/postgres.log" \
      -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=$DIR" start
    ;;
  stop) "$BIN/pg_ctl" -D "$DIR/postgres" stop ;;
  status) "$BIN/pg_ctl" -D "$DIR/postgres" status ;;
  *) echo "usage: $0 start|stop|status" >&2; exit 2 ;;
esac
