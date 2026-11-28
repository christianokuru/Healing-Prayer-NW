from typing import Any

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.schedule import slots_on
from tests.conftest import (
    DEC_3,
    NOV_26,
    book,
    booked,
    check_error,
    confirmed,
    manage,
    status_of,
)

URL = "/availability/slots"


def poll(client, etag=None, **params):
    headers = {"If-None-Match": etag} if etag else {}
    return client.get(URL, params=params, headers=headers)


def test_poll_sees_changes(grace, tom):
    first = poll(grace.client)
    assert first.status_code == 200
    assert first.json()["pollAfterSeconds"] == 10
    etag = first.headers["etag"]
    assert first.headers["cache-control"] == "no-cache"

    unchanged = poll(grace.client, etag)
    assert (unchanged.status_code, unchanged.content) == (304, b"")
    assert unchanged.headers["etag"] == etag
    assert poll(grace.client, f'"other", W/{etag}').status_code == 304

    booking = booked(tom)
    changed = poll(grace.client, etag, date=str(DEC_3))
    assert changed.status_code == 200
    (day,) = changed.json()["days"]
    assert [s["state"] for s in day["slots"]] == ["taken", "open", "open", "open"]
    assert day["openCount"] == 3

    manage(tom, booking, "cancel")
    assert poll(grace.client, etag).status_code == 304


def test_poll_reveals_nothing_about_anyone(grace, tom):
    booking = booked(tom)
    text = poll(grace.client).text
    for secret in (booking, "Tom", "tom@", "SECRET-POINTS", "personId"):
        assert secret not in text
    assert '"taken"' in text
    # Everyone sees the same thing, so the person who booked sees nothing extra.
    assert poll(tom.client).text == text


def test_poll_tracks_the_booking_window(grace, time):
    assert poll(grace.client, date=str(NOV_26)).json()["days"][0]["state"] == "open"
    time.to(slots_on(NOV_26)[0])
    assert poll(grace.client, date=str(NOV_26)).json()["days"][0]["state"] == "closed"


def test_poll_input(anon):
    assert poll(anon).status_code == 200
    for date in ("2026-12-04", "2030-01-03", "nope", "' OR 1=1 --"):
        check_error(poll(anon, date=date), 422, "validation")
    check_error(poll(anon, "x" * 501), 422, "validation")


def test_poll_limit(anon, time):
    for _ in range(60):
        assert poll(anon).status_code == 200
    blocked = poll(anon)
    check_error(blocked, 429, "rate_limited")
    assert 1 <= int(blocked.headers["retry-after"]) <= 60
    time.forward(seconds=60)
    assert poll(anon).status_code == 200


def test_stale_poll_cannot_double_book(grace, tom):
    assert poll(grace.client, date=str(DEC_3)).json()["days"][0]["openCount"] == 4
    booked(tom)
    check_error(book(grace), 409, "slot_taken")


@pytest.mark.parametrize(
    "headers",
    [
        {"Origin": "https://evil.example"},
        {"Origin": "null"},
        {"Origin": ""},
        {"Origin": "http://frontend.test.evil.example"},
        {"Origin": "http://[bad"},
        {"Sec-Fetch-Site": "cross-site"},
    ],
)
def test_cross_origin_writes_are_refused(admin, grace, headers):
    check_error(admin.post("/auth/logout", headers=headers), 403, "forbidden")
    assert admin.get("/auth/me").status_code == 200
    # The public booking form is protected the same way.
    response = grace.client.post("/bookings", json={}, headers=headers)
    check_error(response, 403, "forbidden")


def test_frontend_origin_may_write(admin):
    headers = {"Origin": "http://frontend.test", "Sec-Fetch-Site": "same-site"}
    assert admin.post("/auth/logout", headers=headers).status_code == 204


def test_security_headers(admin, anon):
    for response in (
        admin.get("/admin/bookings"),
        anon.get("/availability"),
        anon.get("/auth/me"),
        anon.get("/nope"),
        anon.post("/auth/logout", headers={"Origin": "https://evil.example"}),
    ):
        assert response.headers["x-content-type-options"] == "nosniff"
        assert response.headers["x-frame-options"] == "DENY"
        assert response.headers["cache-control"] == "no-store"
        assert "default-src 'none'" in response.headers["content-security-policy"]


def test_unknown_host_is_refused(anon):
    assert anon.get("/health", headers={"Host": "evil.example"}).status_code == 400


def test_bookings_are_only_reachable_by_their_link(grace, tom, admin):
    booking = confirmed(tom, admin)
    # Knowing a booking's ID is not enough: the signature is what grants access.
    for path in (
        booking,
        booking.replace("-", ""),
        booking.replace("-", "") + "0" * 32,
    ):
        check_error(grace.client.get(f"/manage/{path}"), 404, "not_found")
        check_error(grace.client.post(f"/manage/{path}/cancel"), 404, "not_found")
    assert status_of(tom, booking) == "confirmed"
    # The admin API needs the minister's session, whatever the visitor sends.
    check_error(grace.client.get("/admin/bookings"), 401, "unauthenticated")


def test_unsafe_production_settings_are_refused():
    safe: dict[str, Any] = {
        "environment": "production",
        "database_url": "x",
        "secret_key": "s" * 40,
        "frontend_url": "https://site.example",
        "cookie_secure": True,
        "smtp_host": "smtp.example",
        "email_reply_to": "prayer@site.example",
        "allowed_hosts": ["api.site.example"],
    }
    Settings.model_validate(safe)
    for unsafe in (
        {"cookie_secure": False},
        {"secret_key": "short"},
        {"secret_key": "change-me-to-a-long-random-string-please"},
        {"allowed_hosts": ["*"]},
        {"smtp_host": None},
        {"smtp_security": "none"},
        {"email_reply_to": None},
    ):
        with pytest.raises(ValidationError):
            Settings.model_validate(safe | unsafe)


class _FakeSMTP:
    """Records what the worker does with the SMTP connection."""

    instances: list["_FakeSMTP"] = []

    def __init__(self, host, port, timeout=None, context=None) -> None:
        self.calls: list[str] = [type(self).__name__]
        self.sent = None
        _FakeSMTP.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def starttls(self, context=None):
        self.calls.append("starttls")

    def login(self, *_):
        self.calls.append("login")

    def send_message(self, message):
        self.sent = message


class _FakeSMTPSSL(_FakeSMTP):
    pass


@pytest.mark.parametrize(
    ("security", "expected"),
    [
        ("starttls", ["_FakeSMTP", "starttls"]),
        ("ssl", ["_FakeSMTPSSL"]),
        ("none", ["_FakeSMTP"]),
    ],
)
def test_email_delivery_uses_the_chosen_security(monkeypatch, security, expected):
    from app import worker
    from app.config import get_settings
    from app.models import OutboxEmail

    settings = get_settings().model_copy(
        update={
            "smtp_host": "smtp.example",
            "smtp_security": security,
            "email_reply_to": "prayer@site.example",
        }
    )
    monkeypatch.setattr(worker, "get_settings", lambda: settings)
    monkeypatch.setattr(worker.smtplib, "SMTP", _FakeSMTP)
    monkeypatch.setattr(worker.smtplib, "SMTP_SSL", _FakeSMTPSSL)
    _FakeSMTP.instances.clear()

    worker.deliver(OutboxEmail(recipient="ann@example.com", subject="Hi", body="Hello"))

    smtp = _FakeSMTP.instances[-1]
    assert smtp.calls == expected
    # Replies reach the ministry's inbox, not the no-reply sender.
    assert smtp.sent is not None
    assert smtp.sent["Reply-To"] == "prayer@site.example"
