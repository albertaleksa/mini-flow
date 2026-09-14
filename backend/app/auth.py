import hashlib
import hmac
import secrets
from fastapi import Header, HTTPException, Request


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), 600_000)
    return f'{salt}${digest.hex()}'


def verify_password(password: str, stored: str) -> bool:
    salt, _ = stored.split('$', 1)
    return hmac.compare_digest(hash_password(password, salt), stored)


def user_from_header(request: Request, authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith('Bearer '):
        return None
    return request.app.state.store.tokens.get(authorization[7:])


async def require_user(request: Request, authorization: str | None = Header(default=None)) -> str:
    user = user_from_header(request, authorization)
    if not user:
        raise HTTPException(401, 'Authentication required')
    return user
