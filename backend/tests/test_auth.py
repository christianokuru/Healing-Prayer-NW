import re

from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import PASSWORD, check_error, mails

EMAIL = "janis@example.com"


def test_login_session_and_logout(anon):
    from tests.conftest import make_admin

    admin = make_admin()
    user = admin.get("/auth/me").json()
    assert set(user) == {"id", "email", "fullName", "role", "createdAt"}
    assert (user["email"], user["role"]) == (EMAIL, "admin")
    response = anon.post(
        "/auth/login", json={"email": " Janis@Example.com ", "password": PASSWORD}
    )
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert "max-age=1209600" in cookie
    assert anon.post("/auth/logout").status_code == 204
    check_error(anon.get("/auth/me"), 401, "unauthenticated")


def test_visitors_cannot_sign_up(anon):
    for path in ("/auth/signup", "/auth/verify-email", "/auth/resend-verification"):
        check_error(anon.post(path, json={}), 404, "not_found")


def test_login_errors_rotation_and_expiry(admin, anon, time):
    for email, password in ((EMAIL, "wrong"), ("nobody@example.com", PASSWORD)):
        body = {"email": email, "password": password}
        check_error(anon.post("/auth/login", json=body), 401, "invalid_credentials")
    before = admin.cookies["hpn_session"]
    admin.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert admin.cookies["hpn_session"] != before
    old = TestClient(app, cookies={"hpn_session": before})
    check_error(old.get("/auth/me"), 401, "unauthenticated")
    time.forward(days=15)
    check_error(admin.get("/auth/me"), 401, "unauthenticated")


def test_login_is_rate_limited(admin, anon):
    body = {"email": EMAIL, "password": "wrong"}
    codes = [anon.post("/auth/login", json=body).status_code for _ in range(21)]
    assert codes[-1] == 429


def test_password_reset(admin, anon, db):
    for email in (EMAIL, "nobody@example.com"):
        response = anon.post("/auth/forgot-password", json={"email": email})
        assert response.status_code == 204
    assert mails(db, "nobody@example.com") == []
    match = re.search(
        r"http://frontend\.test/reset-password\?token=(\S+)",
        mails(db, EMAIL)[-1].body,
    )
    assert match
    body = {"token": match[1], "password": "new-password"}
    short = body | {"password": "short"}
    check_error(anon.post("/auth/reset-password", json=short), 422, "validation")
    assert anon.post("/auth/reset-password", json=body).status_code == 204
    check_error(anon.post("/auth/reset-password", json=body), 400, "invalid_token")
    check_error(admin.get("/auth/me"), 401, "unauthenticated")
    login = {"email": EMAIL, "password": "new-password"}
    assert anon.post("/auth/login", json=login).status_code == 200


def test_reset_link_expires(admin, anon, db, time):
    anon.post("/auth/forgot-password", json={"email": EMAIL})
    token = mails(db, EMAIL)[-1].body.split("token=")[1].split()[0]
    time.forward(minutes=61)
    body = {"token": token, "password": "new-password"}
    check_error(anon.post("/auth/reset-password", json=body), 400, "invalid_token")


def test_error_shape_everywhere(anon):
    check_error(anon.post("/bookings", json={}), 422, "validation")
    check_error(
        anon.post(
            "/auth/login", content="{", headers={"content-type": "application/json"}
        ),
        422,
        "validation",
    )
    check_error(anon.get("/nope"), 404, "not_found")
    check_error(anon.put("/auth/login"), 405, "validation")
    big = {"fullName": "x" * 100_000}
    assert anon.post("/bookings", json=big).status_code == 413
    form = {
        "fullName": "Grace",
        "email": "grace@example.com",
        "phone": "12",
        "prayerPoints": "Peace",
        "slotStart": "2026-12-04T01:00:00.000Z",
    }
    response = anon.post("/bookings", json=form)
    assert "10 digits" in response.json()["message"]


PUBLIC = {
    "/health",
    "/auth/login",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/availability",
    "/availability/slots",
    "/bookings",
    "/manage/{token}",
    "/manage/{token}/cancel",
    "/manage/{token}/late-notice",
}


def test_every_admin_route_needs_the_minister(anon):
    paths = anon.get("/openapi.json").json()["paths"]
    operations = [(p, m) for p, item in paths.items() for m in item if p not in PUBLIC]
    # The admin area, plus the minister's own session.
    assert len(operations) == 18
    assert all(p.startswith(("/admin", "/auth")) for p, _ in operations)
    for path, method in operations:
        url = re.sub(r"\{.*?\}", "2026-12-03", path)
        check_error(anon.request(method, url), 401, "unauthenticated")
