import hashlib
import hmac
import secrets

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


def new_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def digest(value: str) -> str:
    """Keyed hash, so short codes can't be brute-forced from a database leak."""
    key = get_settings().secret_key.get_secret_value().encode()
    return hmac.new(key, value.encode(), hashlib.sha256).hexdigest()


def same_digest(value: str, expected: str) -> bool:
    return hmac.compare_digest(digest(value), expected)
