from fastapi import FastAPI
from fastapi.routing import APIRoute
from sqlmodel import select
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import get_settings
from app.db import SessionDep
from app.errors import COMMON_RESPONSES, register_error_handlers
from app.hardening import CrossOriginWriteMiddleware, SecurityHeadersMiddleware
from app.routers import admin, auth, bookings


def _operation_id(route: APIRoute) -> str:
    """Readable names for the frontend's generated types."""
    return route.name


is_production = get_settings().environment == "production"

app = FastAPI(
    title="Healing Prayer Northwest API",
    version="0.1.0",
    # /openapi.json stays public (the frontend needs it); the UI does not.
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    max_body_size=64 * 1024,
    responses=COMMON_RESPONSES,
    generate_unique_id_function=_operation_id,
)
register_error_handlers(app)

# The last one added runs first.
app.add_middleware(CrossOriginWriteMiddleware)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=get_settings().allowed_hosts,
    www_redirect=False,
)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth.router)
app.include_router(bookings.router)
app.include_router(admin.router)


@app.get("/health", tags=["health"])
def health(session: SessionDep) -> dict[str, str]:
    session.exec(select(1)).one()
    return {"status": "ok"}
