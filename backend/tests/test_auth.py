import re

from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import PASSWORD, check_error, last_code, mails

SIGNUP = {
    "fullName": "Grace Mensah",
    "email": "  Grace@Example.com ",
    "phone": "(403) 555-0142",
    "password": "long-enough",
}
EMAIL = "grace@example.com"


def test_signup_verify_and_session(anon, db):
    response = anon.post("/auth/signup", json=SIGNUP)
    assert (response.status_code, response.json()) == (201, {"email": EMAIL})
    assert not response.cookies
    check_error(anon.post("/auth/signup", json=SIGNUP), 409, "email_taken")

    login = {"email": EMAIL, "password": "long-enough"}
    check_error(anon.post("/auth/login", json=login), 403, "email_not_verified")

    code = last_code(db, EMAIL)
    response = anon.post("/auth/verify-email", json={"email": EMAIL, "code": code})
    assert response.status_code == 200
    user = response.json()
    assert set(user) == {
        "id",
        "email",
        "fullName",
        "phone",
        "role",
        "emailVerified",
        "createdAt",
    }
    assert user["role"] == "visitor"
    assert user["createdAt"] == "2026-11-23T17:00:00.000Z"
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert "max-age=1209600" in cookie
    assert anon.get("/auth/me").json() == user

    # A used code can't start another session.
    other = TestClient(app)
    check_error(
        other.post("/auth/verify-email", json={"email": EMAIL, "code": code}),
        400,
        "invalid_code",
    )

    assert anon.post("/auth/logout").status_code == 204
    check_error(anon.get("/auth/me"), 401, "unauthenticated")


def test_role_cannot_be_chosen(anon, db):
    anon.post("/auth/signup", json=SIGNUP | {"role": "admin"})
    body = {"email": EMAIL, "code": last_code(db, EMAIL)}
    assert anon.post("/auth/verify-email", json=body).json()["role"] == "visitor"


def test_codes_expire_and_lock_after_five_tries(anon, db, time):
    anon.post("/auth/signup", json=SIGNUP)
    code = last_code(db, EMAIL)
    wrong = {"email": EMAIL, "code": "x"}
    for _ in range(5):
        check_error(anon.post("/auth/verify-email", json=wrong), 400, "invalid_code")
    right = {"email": EMAIL, "code": code}
    check_error(anon.post("/auth/verify-email", json=right), 400, "invalid_code")

    time.forward(seconds=30)
    resend = anon.post("/auth/resend-verification", json={"email": EMAIL})
    assert resend.status_code == 204
    fresh = last_code(db, EMAIL)
    time.forward(minutes=31)
    body = {"email": EMAIL, "code": fresh}
    check_error(anon.post("/auth/verify-email", json=body), 400, "invalid_code")


def test_verify_unknown_email(anon):
    body = {"email": "nobody@example.com", "code": "123456"}
    check_error(anon.post("/auth/verify-email", json=body), 404, "not_found")


def test_login_errors_rotation_and_expiry(grace, anon, time):
    for email, password in ((EMAIL, "wrong"), ("nobody@example.com", PASSWORD)):
        body = {"email": email, "password": password}
        check_error(anon.post("/auth/login", json=body), 401, "invalid_credentials")
    before = grace.cookies["hpn_session"]
    grace.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert grace.cookies["hpn_session"] != before
    old = TestClient(app, cookies={"hpn_session": before})
    check_error(old.get("/auth/me"), 401, "unauthenticated")
    time.forward(days=15)
    check_error(grace.get("/auth/me"), 401, "unauthenticated")


def test_login_is_rate_limited(grace, anon):
    body = {"email": EMAIL, "password": "wrong"}
    codes = [anon.post("/auth/login", json=body).status_code for _ in range(21)]
    assert codes[-1] == 429


def test_password_reset(grace, anon, db, time):
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
    check_error(grace.get("/auth/me"), 401, "unauthenticated")
    login = {"email": EMAIL, "password": "new-password"}
    assert anon.post("/auth/login", json=login).status_code == 200


def test_reset_link_expires(grace, anon, db, time):
    anon.post("/auth/forgot-password", json={"email": EMAIL})
    token = mails(db, EMAIL)[-1].body.split("token=")[1].split()[0]
    time.forward(minutes=61)
    body = {"token": token, "password": "new-password"}
    check_error(anon.post("/auth/reset-password", json=body), 400, "invalid_token")


def test_profile_and_password(grace):
    response = grace.patch(
        "/me", json={"fullName": " New Name ", "phone": "4035550199", "role": "admin"}
    )
    assert response.json()["fullName"] == "New Name"
    assert response.json()["role"] == "visitor"
    check_error(grace.patch("/me", json={"phone": "123"}), 422, "validation")
    other = TestClient(app)
    other.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
    bad = {"currentPassword": "nope", "newPassword": "new-password"}
    check_error(grace.post("/me/password", json=bad), 401, "invalid_credentials")
    good = bad | {"currentPassword": PASSWORD}
    assert grace.post("/me/password", json=good).status_code == 204
    assert grace.get("/auth/me").status_code == 200
    check_error(other.get("/auth/me"), 401, "unauthenticated")


def test_error_shape_everywhere(anon):
    check_error(anon.post("/auth/signup", json={}), 422, "validation")
    check_error(
        anon.post(
            "/auth/login", content="{", headers={"content-type": "application/json"}
        ),
        422,
        "validation",
    )
    check_error(anon.get("/nope"), 404, "not_found")
    check_error(anon.put("/auth/login"), 405, "validation")
    big = SIGNUP | {"fullName": "x" * 100_000}
    assert anon.post("/auth/signup", json=big).status_code == 413
    bad_phone = SIGNUP | {"phone": "12"}
    response = anon.post("/auth/signup", json=bad_phone)
    assert "10 digits" in response.json()["message"]
    nul = SIGNUP | {"fullName": "a\x00b"}
    check_error(anon.post("/auth/signup", json=nul), 422, "validation")


def test_every_protected_route_needs_a_session(anon, grace):
    public = {
        "/health",
        "/auth/signup",
        "/auth/verify-email",
        "/auth/resend-verification",
        "/auth/login",
        "/auth/forgot-password",
        "/auth/reset-password",
    }
    paths = anon.get("/openapi.json").json()["paths"]
    operations = [(p, m) for p, item in paths.items() for m in item if p not in public]
    assert len(operations) == 23  # 28 in the spec minus 6 public, plus slot polling
    for path, method in operations:
        url = re.sub(r"\{.*?\}", "2026-12-03", path)
        check_error(anon.request(method, url), 401, "unauthenticated")
        if path.startswith("/admin"):
            check_error(grace.request(method, url), 403, "forbidden")
