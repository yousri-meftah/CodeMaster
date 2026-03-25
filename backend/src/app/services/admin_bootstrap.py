from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import User
from app.services.auth import hash_password
from config import settings


def bootstrap_admin(db: Session) -> str:
    if not settings.ADMIN_BOOTSTRAP_ENABLED:
        return "disabled"

    email = (settings.ADMIN_EMAIL or "").strip().lower()
    password = settings.ADMIN_PASSWORD or ""
    name = (settings.ADMIN_NAME or "Administrator").strip() or "Administrator"

    if not email or not password:
        raise RuntimeError("ADMIN_EMAIL and ADMIN_PASSWORD are required when ADMIN_BOOTSTRAP_ENABLED=true")

    user = db.query(User).filter(User.email == email).first()
    hashed_password = hash_password(password)
    if not user:
        user = User(
            name=name,
            email=email,
            phone=None,
            password=hashed_password,
            role="admin",
            is_admin=True,
        )
        db.add(user)
        db.commit()
        return "created"

    user.name = name
    user.password = hashed_password
    user.role = "admin"
    user.is_admin = True
    db.commit()
    return "updated"
