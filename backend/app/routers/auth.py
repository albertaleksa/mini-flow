import secrets
from fastapi import APIRouter, HTTPException, Request
from app.auth import hash_password, verify_password
from app.models import Credentials

router = APIRouter(prefix='/auth', tags=['Auth'])


@router.post('/register', status_code=201)
async def register(body: Credentials, request: Request):
    store = request.app.state.store
    if len(body.password) < 8:
        raise HTTPException(422, 'Password must have at least 8 characters')
    store.register(body.username, hash_password(body.password))
    return {'username': body.username}


@router.post('/token')
async def token(body: Credentials, request: Request):
    store = request.app.state.store
    stored = store.password_hash(body.username)
    if not stored or not verify_password(body.password, stored):
        raise HTTPException(401, 'Invalid credentials')
    value = secrets.token_urlsafe(32)
    store.add_token(value, body.username)
    return {'access_token': value, 'token_type': 'bearer'}
