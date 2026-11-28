from logging.config import fileConfig

from sqlmodel import SQLModel, create_engine

from alembic import context
from app import models  # noqa: F401
from app.config import get_settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

engine = create_engine(get_settings().database_url.get_secret_value())

with engine.connect() as connection:
    context.configure(
        connection=connection,
        target_metadata=SQLModel.metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()
