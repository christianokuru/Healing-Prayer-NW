"""Accounts: `python -m app.seed` (development) or `python -m app.seed --admin`.

`--admin` creates a real admin and asks for the details, for production.
"""

import getpass
import sys

from pydantic import TypeAdapter
from sqlmodel import Session

from app.config import get_settings
from app.db import get_engine
from app.models import Role, User
from app.schemas import Email, Name, NewPassword, Phone
from app.security import hash_password
from app.services.accounts import find_by_email

# The same demo accounts as the frontend's mock API.
DEMO = [
    ("janis@example.com", "Janis", "(403) 555-0100", Role.admin, "admin-demo-1"),
    (
        "grace@example.com",
        "Grace Mensah",
        "(403) 555-0142",
        Role.visitor,
        "prayer-demo-1",
    ),
]


def add_user(
    session: Session, email: str, name: str, phone: str, role: Role, password: str
) -> None:
    if find_by_email(session, email):
        print(f"{email} already exists")
        return
    session.add(
        User(
            email=email,
            full_name=name,
            phone=phone,
            role=role,
            email_verified=True,
            password_hash=hash_password(password),
        )
    )
    session.commit()
    print(f"Created {role} {email}")


def main() -> None:
    with Session(get_engine()) as session:
        if "--admin" in sys.argv:
            add_user(
                session,
                TypeAdapter(Email).validate_python(input("Email: ")),
                TypeAdapter(Name).validate_python(input("Full name: ")),
                TypeAdapter(Phone).validate_python(input("Phone: ")),
                Role.admin,
                TypeAdapter(NewPassword).validate_python(getpass.getpass()),
            )
        elif get_settings().environment == "production":
            sys.exit("Demo accounts are for development only. Use --admin.")
        else:
            for account in DEMO:
                add_user(session, *account)


if __name__ == "__main__":
    main()
