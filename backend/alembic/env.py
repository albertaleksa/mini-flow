from alembic import context
from app.database import Base, DEFAULT_DATABASE_URL, make_engine
import os
import app.database  # Register every mapped table for autogenerate.

config = context.config
target_metadata = Base.metadata


def run_migrations_offline():
    context.configure(url=os.environ.get('MINIFLOW_DATABASE_URL', DEFAULT_DATABASE_URL),
                      target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connection = config.attributes.get('connection')
    if connection is None:
        engine = make_engine()
        with engine.connect() as connection:
            context.configure(connection=connection, target_metadata=target_metadata)
            with context.begin_transaction():
                context.run_migrations()
    else:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
