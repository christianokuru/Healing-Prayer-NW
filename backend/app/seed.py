"""The prayer minister's login: `python -m app.seed` (development) or
`python -m app.seed --admin` (asks for real details, for production).

Visitors have no accounts, so there is nothing else to create.
"""

import getpass
import sys

from pydantic import TypeAdapter
from sqlmodel import Session

from app.config import get_settings
from app.db import get_engine
from app.models import Role, User
from app.schemas import Email, Name, NewPassword
from app.security import hash_password
from app.services.accounts import find_by_email

# The same demo login as the frontend's mock API.
DEMO_ADMIN = ("janis@example.com", "Janis Bradley", "admin-demo-1")


def add_admin(session: Session, email: str, name: str, password: str) -> None:
    if find_by_email(session, email):
        print(f"{email} already exists")
        return
    session.add(
        User(
            email=email,
            full_name=name,
            role=Role.admin,
            password_hash=hash_password(password),
        )
    )
    session.commit()
    print(f"Created admin {email}")


def main() -> None:
    with Session(get_engine()) as session:
        if "--admin" in sys.argv:
            add_admin(
                session,
                TypeAdapter(Email).validate_python(input("Email: ")),
                TypeAdapter(Name).validate_python(input("Full name: ")),
                TypeAdapter(NewPassword).validate_python(getpass.getpass()),
            )
        elif get_settings().environment == "production":
            sys.exit("The demo login is for development only. Use --admin.")
        else:
            add_admin(session, *DEMO_ADMIN)


if __name__ == "__main__":
    main()
