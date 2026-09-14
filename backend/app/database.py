import os
from pathlib import Path

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy.pool import StaticPool

DEFAULT_DATABASE_URL = f"sqlite:///{Path(__file__).resolve().parents[1] / 'miniflow.db'}"


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = 'users'
    username: Mapped[str] = mapped_column(String(255), primary_key=True)
    password_hash: Mapped[str] = mapped_column(String(255))


class Token(Base):
    __tablename__ = 'tokens'
    value: Mapped[str] = mapped_column(String(255), primary_key=True)
    username: Mapped[str] = mapped_column(ForeignKey('users.username', ondelete='CASCADE'), index=True)


class Board(Base):
    __tablename__ = 'boards'
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    share_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    template: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[str] = mapped_column(String(32))
    created_by: Mapped[str | None] = mapped_column(ForeignKey('users.username', ondelete='SET NULL'), index=True)


class Column(Base):
    __tablename__ = 'columns'
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    board_id: Mapped[str] = mapped_column(ForeignKey('boards.id', ondelete='CASCADE'), index=True)
    name: Mapped[str] = mapped_column(String(255))
    position: Mapped[int] = mapped_column(Integer)
    is_done: Mapped[bool] = mapped_column(Boolean)


class Member(Base):
    __tablename__ = 'members'
    __table_args__ = (UniqueConstraint('board_id', 'username'),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    board_id: Mapped[str] = mapped_column(ForeignKey('boards.id', ondelete='CASCADE'), index=True)
    username: Mapped[str] = mapped_column(ForeignKey('users.username', ondelete='CASCADE'), index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    joined_at: Mapped[str] = mapped_column(String(32))


class Task(Base):
    __tablename__ = 'tasks'
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    board_id: Mapped[str] = mapped_column(ForeignKey('boards.id', ondelete='CASCADE'), index=True)
    column_id: Mapped[str] = mapped_column(ForeignKey('columns.id'), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    priority: Mapped[str | None] = mapped_column(String(16))
    due_date: Mapped[str | None] = mapped_column(String(10))
    assignee_id: Mapped[str | None] = mapped_column(ForeignKey('members.id', ondelete='SET NULL'))
    position: Mapped[int] = mapped_column(Integer)
    completed_at: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[str] = mapped_column(String(32))
    updated_at: Mapped[str] = mapped_column(String(32))


def make_engine(database_url: str | None = None):
    url = database_url or os.environ.get('MINIFLOW_DATABASE_URL', DEFAULT_DATABASE_URL)
    sqlite = url.startswith('sqlite:')
    options = {'connect_args': {'check_same_thread': False}} if sqlite else {}
    if url in ('sqlite://', 'sqlite:///:memory:'):
        options['poolclass'] = StaticPool
    engine = create_engine(url, **options)
    if sqlite:
        @event.listens_for(engine, 'connect')
        def enable_foreign_keys(connection, _):
            cursor = connection.cursor()
            cursor.execute('PRAGMA foreign_keys=ON')
            cursor.close()
    return engine


def make_session_factory(engine):
    return sessionmaker(engine, expire_on_commit=False)
