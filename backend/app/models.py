from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')


class CreateBoard(StrictModel):
    name: str = Field(min_length=1)
    template: Literal['default', 'software', 'weekly']


class JoinBoard(StrictModel):
    displayName: str = Field(min_length=1)


class ColumnName(StrictModel):
    name: str = Field(min_length=1)


class MoveColumn(StrictModel):
    toIndex: int = Field(ge=0)


class MoveTask(StrictModel):
    toColumnId: str
    toIndex: int = Field(ge=0)


class TaskFields(StrictModel):
    title: str = Field(min_length=1)
    description: str
    priority: Literal['low', 'medium', 'high'] | None
    dueDate: date | None
    assigneeId: str | None


class Credentials(StrictModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
