import os
from pathlib import Path

from dotenv import dotenv_values

# Only TEST_DATABASE_URL is taken from a local .env; nothing else in it reaches tests.
TEST_URL = (
    os.environ.get("TEST_DATABASE_URL")
    or dotenv_values(Path(__file__).parents[1] / ".env").get("TEST_DATABASE_URL")
    or "postgresql+psycopg://hpn:hpn@127.0.0.1:5433/hpn_test"
)
assert TEST_URL.split("?")[0].endswith("_test"), "Tests wipe their database"
os.environ.update(
    DATABASE_URL=TEST_URL,
    ENVIRONMENT="development",
    SECRET_KEY="test-secret-test-secret-test-secret!",
    FRONTEND_URL="http://frontend.test",
    COOKIE_SECURE="false",
    ALLOWED_HOSTS='["testserver"]',
    MINISTRY_ADDRESS="1 Test Street",
    SMTP_HOST="",
)

# A developer's own .env (real SMTP, their database) must never leak into tests.
from app.config import Settings  # noqa: E402

Settings.model_config["env_file"] = None

# ruff: noqa: E402
import datetime as dt
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlmodel import Session, SQLModel, col, select

from alembic import command
from app import clock
from app.db import get_engine
from app.main import app
from app.models import OutboxEmail, Role, User
from app.schedule import slots_on
from app.security import hash_password

# Monday 23 November 2026, 11:00 in Calgary.
START = datetime(2026, 11, 23, 17, tzinfo=UTC)
NOV_26 = dt.date(2026, 11, 26)
DEC_3 = dt.date(2026, 12, 3)
DEC_10 = dt.date(2026, 12, 10)
PASSWORD = "password-1"
PASSWORD_HASH = hash_password(PASSWORD)


@pytest.fixture(scope="session", autouse=True)
def database():
    base, name = TEST_URL.rsplit("/", 1)
    admin = create_engine(f"{base}/postgres", isolation_level="AUTOCOMMIT")
    with admin.connect() as connection:
        connection.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))
        connection.execute(text(f'CREATE DATABASE "{name}"'))
    admin.dispose()
    command.upgrade(Config("alembic.ini"), "head")
    yield
    get_engine().dispose()


@pytest.fixture(autouse=True)
def clean(database):
    tables = ", ".join(t.name for t in SQLModel.metadata.sorted_tables)
    with get_engine().begin() as connection:
        connection.execute(text(f"TRUNCATE {tables} CASCADE"))


class Clock:
    now = START

    def to(self, moment: datetime) -> None:
        self.now = moment

    def forward(self, **kwargs: float) -> None:
        self.now += timedelta(**kwargs)


@pytest.fixture(autouse=True)
def time(monkeypatch) -> Clock:
    fake = Clock()
    monkeypatch.setattr(clock, "utcnow", lambda: fake.now)
    return fake


@pytest.fixture
def db():
    with Session(get_engine()) as session:
        yield session


@pytest.fixture
def anon():
    return TestClient(app)


def make_admin(email: str = "janis@example.com") -> TestClient:
    with Session(get_engine()) as session:
        session.add(
            User(
                email=email,
                full_name="Janis",
                role=Role.admin,
                password_hash=PASSWORD_HASH,
            )
        )
        session.commit()
    client = TestClient(app)
    response = client.post("/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return client


@dataclass
class Visitor:
    """Someone booking from the public site: no account, just their details."""

    email: str
    full_name: str
    client: TestClient


def make_visitor(email: str) -> Visitor:
    return Visitor(email, email.split("@")[0].title(), TestClient(app))


@pytest.fixture
def grace():
    return make_visitor("grace@example.com")


@pytest.fixture
def tom():
    return make_visitor("tom@example.com")


@pytest.fixture
def admin():
    return make_admin()


# booking id -> its private manage token, as returned when it was created
TOKENS: dict[str, str] = {}


def slot(day: dt.date, index: int = 0) -> str:
    return slots_on(day)[index].strftime("%Y-%m-%dT%H:%M:%S.000Z")


def book(visitor: Visitor, day=DEC_3, index=0, **extra):
    response = visitor.client.post(
        "/bookings",
        json={
            "fullName": visitor.full_name,
            "email": visitor.email,
            "phone": "(403) 555-0142",
            "prayerPoints": "SECRET-POINTS",
            "slotStart": slot(day, index),
        }
        | extra,
    )
    if response.status_code == 201:
        body = response.json()
        TOKENS[body["booking"]["id"]] = body["manageToken"]
    return response


def booked(visitor: Visitor, day=DEC_3, index=0, **extra) -> str:
    response = book(visitor, day, index, **extra)
    assert response.status_code == 201, response.text
    return response.json()["booking"]["id"]


def approve(admin, booking_id: str, **body):
    return admin.post(f"/admin/bookings/{booking_id}/approve", json=body)


def confirmed(visitor: Visitor, admin, day=DEC_3, index=0, **extra) -> str:
    booking_id = booked(visitor, day, index, **extra)
    assert approve(admin, booking_id).status_code == 200
    return booking_id


def manage(visitor: Visitor, booking_id: str, action: str = "", **body):
    """Use the private link: no action views it; "cancel" or "late-notice" act."""
    url = f"/manage/{TOKENS[booking_id]}" + (f"/{action}" if action else "")
    return visitor.client.post(url, json=body) if action else visitor.client.get(url)


def status_of(visitor: Visitor, booking_id: str) -> str:
    return manage(visitor, booking_id).json()["status"]


def check_error(response, status: int, code: str) -> None:
    assert response.status_code == status, response.text
    assert set(response.json()) == {"code", "message"}
    assert response.json()["code"] == code


def mails(db: Session, recipient: str) -> list[OutboxEmail]:
    db.rollback()
    return list(
        db.exec(
            select(OutboxEmail)
            .where(OutboxEmail.recipient == recipient)
            .order_by(col(OutboxEmail.send_after))
        )
    )


def subjects(db: Session, recipient: str) -> list[str]:
    return [m.subject for m in mails(db, recipient)]
