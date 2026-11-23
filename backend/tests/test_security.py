from typing import Any

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.schedule import slots_on
from tests.conftest import DEC_3, NOV_26, book, booked, check_error, confirmed, slot

URL = "/availability/slots"


def poll(client, etag=None, **params):
    headers = {"If-None-Match": etag} if etag else {}
    return client.get(URL, params=params, headers=headers)


def test_poll_sees_changes(grace, tom):
    first = poll(grace)
    assert first.status_code == 200
    assert first.json()["pollAfterSeconds"] == 10
    etag = first.headers["etag"]
    assert first.headers["cache-control"] == "private, no-cache"

    unchanged = poll(grace, etag)
    assert (unchanged.status_code, unchanged.content) == (304, b"")
    assert unchanged.headers["etag"] == etag
    assert poll(grace, f'"other", W/{etag}').status_code == 304

    booking = booked(tom)
    changed = poll(grace, etag, date=str(DEC_3))
    assert changed.status_code == 200
    (day,) = changed.json()["days"]
    assert [s["state"] for s in day["slots"]] == ["taken", "open", "open", "open"]
    assert day["openCount"] == 3

    tom.post(f"/bookings/{booking}/cancel")
    assert poll(grace, etag).status_code == 304


def test_poll_reveals_nothing_about_others(grace, tom):
    booking = booked(tom)
    text = poll(grace, excludeBookingId=booking).text
    for secret in (booking, "Tom", "tom@", "SECRET-POINTS", "userId"):
        assert secret not in text
    assert '"taken"' in text
    assert '"mine"' in poll(tom).text
    # An ETag from one person never matches another's.
    assert poll(grace, poll(tom).headers["etag"]).status_code == 200


def test_poll_tracks_the_booking_window(grace, time):
    assert poll(grace, date=str(NOV_26)).json()["days"][0]["state"] == "open"
    time.to(slots_on(NOV_26)[0])
    assert poll(grace, date=str(NOV_26)).json()["days"][0]["state"] == "closed"


def test_poll_input(grace, admin, anon):
    check_error(poll(anon), 401, "unauthenticated")
    check_error(poll(admin), 403, "forbidden")
    for date in ("2026-12-04", "2030-01-03", "nope", "' OR 1=1 --"):
        check_error(poll(grace, date=date), 422, "validation")
    check_error(poll(grace, excludeBookingId="nope"), 422, "validation")
    check_error(poll(grace, "x" * 501), 422, "validation")


def test_poll_limit_is_per_person(grace, tom, time):
    for _ in range(60):
        assert poll(grace).status_code == 200
    blocked = poll(grace)
    check_error(blocked, 429, "rate_limited")
    assert 1 <= int(blocked.headers["retry-after"]) <= 60
    assert poll(tom).status_code == 200
    time.forward(seconds=60)
    assert poll(grace).status_code == 200


def test_stale_poll_cannot_double_book(grace, tom):
    assert poll(grace, date=str(DEC_3)).json()["days"][0]["openCount"] == 4
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
def test_cross_origin_writes_are_refused(grace, headers):
    check_error(grace.post("/auth/logout", headers=headers), 403, "forbidden")
    assert grace.get("/auth/me").status_code == 200


def test_frontend_origin_may_write(grace):
    headers = {"Origin": "http://frontend.test", "Sec-Fetch-Site": "same-site"}
    assert grace.post("/auth/logout", headers=headers).status_code == 204


def test_security_headers(grace, anon):
    for response in (
        grace.get("/me/bookings"),
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


def test_other_peoples_bookings_are_out_of_reach(grace, tom, admin):
    booking = confirmed(tom, admin)
    for action, body in (
        ("cancel", {}),
        ("late-notice", {}),
        ("reschedule", {"slotStart": slot(DEC_3, 1)}),
    ):
        response = grace.post(f"/bookings/{booking}/{action}", json=body)
        check_error(response, 404, "not_found")


def test_unsafe_production_settings_are_refused():
    safe: dict[str, Any] = {
        "environment": "production",
        "database_url": "x",
        "secret_key": "s" * 40,
        "frontend_url": "https://site.example",
        "cookie_secure": True,
        "smtp_host": "smtp.example",
        "allowed_hosts": ["api.site.example"],
    }
    Settings.model_validate(safe)
    for unsafe in (
        {"cookie_secure": False},
        {"secret_key": "short"},
        {"secret_key": "change-me-to-a-long-random-string-please"},
        {"allowed_hosts": ["*"]},
        {"smtp_host": None},
    ):
        with pytest.raises(ValidationError):
            Settings.model_validate(safe | unsafe)
