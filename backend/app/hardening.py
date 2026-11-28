"""Protections applied to every request, as plain ASGI middleware."""

from urllib.parse import urlsplit

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.config import get_settings
from app.errors import ErrorCode, error_json

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
DOCS_PATHS = {"/docs", "/docs/oauth2-redirect", "/redoc"}


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
                headers["X-Frame-Options"] = "DENY"
                headers["Referrer-Policy"] = "no-referrer"
                # Responses hold personal data: never keep them in shared caches.
                headers.setdefault("Cache-Control", "no-store")
                if scope["path"] not in DOCS_PATHS:
                    headers["Content-Security-Policy"] = (
                        "default-src 'none'; frame-ancestors 'none'"
                    )
                if get_settings().environment == "production":
                    headers["Strict-Transport-Security"] = "max-age=31536000"
            await send(message)

        await self.app(scope, receive, send_with_headers)


class CrossOriginWriteMiddleware:
    """Refuse browser writes from other sites (CSRF).

    SameSite=Lax alone still lets sibling subdomains through. Requests without these
    headers don't come from a browser page, so they carry no ambient cookie to abuse.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["method"] not in SAFE_METHODS:
            headers = Headers(scope=scope)
            if not self._is_allowed(headers):
                response = error_json(ErrorCode.forbidden)
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)

    @staticmethod
    def _is_allowed(headers: Headers) -> bool:
        origin = headers.get("origin")
        if origin is None:
            return headers.get("sec-fetch-site") != "cross-site"
        if origin.lower() == get_settings().frontend_url.lower():
            return True
        # The API's own /docs page.
        try:
            return bool(origin) and urlsplit(origin).netloc == headers.get("host")
        except ValueError:
            return False
