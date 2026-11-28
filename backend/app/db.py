from collections.abc import Iterator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy import Engine
from sqlmodel import Session, create_engine

from app.config import get_settings

POOL_SIZE = 10
MAX_OVERFLOW = 5


@lru_cache
def get_engine() -> Engine:
    return create_engine(
        get_settings().database_url.get_secret_value(),
        pool_size=POOL_SIZE,
        max_overflow=MAX_OVERFLOW,
        pool_pre_ping=True,
        # Parameters can contain prayer points: keep them out of logs and errors.
        hide_parameters=True,
        connect_args={"options": "-c timezone=UTC"},
    )


def get_session() -> Iterator[Session]:
    with Session(get_engine()) as session:
        yield session


SessionDep = Annotated[
    Session, Depends(get_session, max_concurrency=POOL_SIZE + MAX_OVERFLOW)
]
