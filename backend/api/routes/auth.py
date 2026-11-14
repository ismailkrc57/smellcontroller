"""Basit kullanıcı girişi / kaydı.

Kullanıcılar backend/data/users.json içinde PBKDF2 hash'li şifrelerle tutulur.
Token, sunucu sırrıyla HMAC imzalı (stateless) bir değerdir.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import threading
import time

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from config import DATA_DIR

router = APIRouter(prefix="/auth", tags=["auth"])

USERS_FILE = DATA_DIR / "users.json"
SECRET_FILE = DATA_DIR / ".auth_secret"
TOKEN_TTL = 7 * 24 * 3600
_lock = threading.Lock()

# İlk çalıştırmada oluşturulan demo hesap (ortam değişkeniyle değiştirilebilir)
DEMO_EMAIL = os.environ.get("SMELL_DEMO_EMAIL", "demo@smellcontrol.io")
DEMO_PASSWORD = os.environ.get("SMELL_DEMO_PASSWORD", "smellcontrol")


def _secret() -> bytes:
    if not SECRET_FILE.exists():
        SECRET_FILE.write_text(secrets.token_hex(32))
    return SECRET_FILE.read_text().strip().encode()


def _hash(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()


def _load_users() -> dict:
    if USERS_FILE.exists():
        return json.loads(USERS_FILE.read_text())
    salt = secrets.token_hex(16)
    users = {DEMO_EMAIL: {"name": "Demo", "salt": salt, "hash": _hash(DEMO_PASSWORD, salt)}}
    USERS_FILE.write_text(json.dumps(users, indent=2))
    return users


def _make_token(email: str) -> str:
    payload = base64.urlsafe_b64encode(json.dumps({"e": email, "x": int(time.time()) + TOKEN_TTL}).encode()).decode()
    sig = hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"


def verify_token(token: str) -> str | None:
    try:
        payload, sig = token.rsplit(".", 1)
        expected = hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(base64.urlsafe_b64decode(payload.encode()))
        if data["x"] < time.time():
            return None
        return data["e"]
    except Exception:
        return None


class LoginBody(BaseModel):
    email: str
    password: str


class RegisterBody(LoginBody):
    name: str = ""


@router.post("/login")
def login(body: LoginBody):
    email = body.email.strip().lower()
    with _lock:
        users = _load_users()
    user = users.get(email)
    if not user or not hmac.compare_digest(user["hash"], _hash(body.password, user["salt"])):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")
    return {"token": _make_token(email), "user": {"email": email, "name": user.get("name", "")}}


@router.post("/register")
def register(body: RegisterBody):
    email = body.email.strip().lower()
    if "@" not in email or len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Geçerli bir e-posta ve en az 6 karakterli şifre girin")
    with _lock:
        users = _load_users()
        if email in users:
            raise HTTPException(status_code=409, detail="Bu e-posta zaten kayıtlı")
        salt = secrets.token_hex(16)
        users[email] = {"name": body.name.strip(), "salt": salt, "hash": _hash(body.password, salt)}
        USERS_FILE.write_text(json.dumps(users, indent=2))
    return {"token": _make_token(email), "user": {"email": email, "name": body.name.strip()}}


@router.get("/me")
def me(authorization: str = Header(default="")):
    email = verify_token(authorization.removeprefix("Bearer ").strip())
    if not email:
        raise HTTPException(status_code=401, detail="Oturum geçersiz")
    user = _load_users().get(email, {})
    return {"email": email, "name": user.get("name", "")}
