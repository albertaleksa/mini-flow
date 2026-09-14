from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.store import Store
from app.routers import auth, boards, columns, tasks


def create_app():
    app = FastAPI(title='MiniFlow board API', version='0.1.0')
    app.state.store = Store()
    for router in (auth.router, boards.router, columns.router, tasks.router):
        app.include_router(router, prefix='/api')

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        return JSONResponse(status_code=422, content={'detail': str(exc.errors()[0]['msg'])})

    return app


app = create_app()
