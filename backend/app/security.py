import hashlib
import hmac
import secrets
import uuid

from pwdlib import PasswordHash

from app.config import get_settings

_hasher = PasswordHash.recommended()  # Argon2id
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe())


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    """Takes as long for unknown accounts, so timing doesn't reveal them."""
    matches = _hasher.verify(password, password_hash or _DUMMY_HASH)
    return matches and password_hash is not None


def new_token() -> str:
    return secrets.token_urlsafe(32)


def digest(value: str) -> str:
    """Keyed hash, so short codes can't be brute-forced from a database leak."""
    key = get_settings().secret_key.get_secret_value().encode()
    return hmac.new(key, value.encode(), hashlib.sha256).hexdigest()


def same_digest(value: str, expected: str) -> bool:
    return hmac.compare_digest(digest(value), expected)


# --- "Manage my booking" links
#
# Visitors have no accounts, so each booking has a private link. The token is
# the booking ID plus a keyed signature, so nothing extra is stored and it can't
# be guessed or forged. Changing SECRET_KEY invalidates every link.

_MANAGE_SIG_LENGTH = 32


def manage_token(booking_id: uuid.UUID) -> str:
    return booking_id.hex + digest(f"manage:{booking_id}")[:_MANAGE_SIG_LENGTH]


def booking_id_from_token(token: str) -> uuid.UUID | None:
    """The booking a token is for, or None if it isn't a genuine token."""
    if len(token) != 32 + _MANAGE_SIG_LENGTH:
        return None
    try:
        booking_id = uuid.UUID(hex=token[:32])
    except ValueError:
        return None
    expected = manage_token(booking_id)
    return booking_id if hmac.compare_digest(token, expected) else None
