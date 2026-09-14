from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from alembic import command
from alembic.config import Config
from pathlib import Path
from app.database import make_engine, make_session_factory
from app.store import Store
from app.routers import auth, boards, columns, tasks


def create_app(database_url: str | None = None):
    app = FastAPI(title='MiniFlow board API', version='0.1.0')
    engine = make_engine(database_url)
    config = Config(str(Path(__file__).resolve().parents[1] / 'alembic.ini'))
    with engine.begin() as connection:
        config.attributes['connection'] = connection
        command.upgrade(config, 'head')
    app.state.store = Store(make_session_factory(engine))
    app.state.engine = engine
    for router in (auth.router, boards.router, columns.router, tasks.router):
        app.include_router(router, prefix='/api')

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        return JSONResponse(status_code=422, content={'detail': str(exc.errors()[0]['msg'])})

    return app


app = create_app()
