from __future__ import annotations

import math
import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple

from fastapi import HTTPException, Request, status

from app.services.auth import decode_access_token
from config import settings

_UNIT_SECONDS = {
    "second": 1,
    "seconds": 1,
    "minute": 60,
    "minutes": 60,
    "hour": 3600,
    "hours": 3600,
}


def parse_limit(value: str) -> Tuple[int, int]:
    raw = (value or "").strip().lower()
    amount_part, _, unit_part = raw.partition("/")
    if not amount_part or not unit_part:
        raise ValueError(f"Invalid rate limit format: {value!r}")

    amount = int(amount_part)
    unit_seconds = _UNIT_SECONDS.get(unit_part)
    if amount <= 0 or not unit_seconds:
        raise ValueError(f"Invalid rate limit format: {value!r}")

    return amount, unit_seconds


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._events: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window_seconds: int) -> float | None:
        now = time.monotonic()
        window_start = now - window_seconds

        with self._lock:
            bucket = self._events[key]
            while bucket and bucket[0] <= window_start:
                bucket.popleft()

            if len(bucket) >= limit:
                retry_after = (bucket[0] + window_seconds) - now
                return max(0.0, retry_after)

            bucket.append(now)
            return None

    def reset(self) -> None:
        with self._lock:
            self._events.clear()


_limiter = InMemoryRateLimiter()


def reset_rate_limiter() -> None:
    _limiter.reset()


def _extract_identity(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        first_ip = forwarded_for.split(",")[0].strip()
        if first_ip:
            return f"ip:{first_ip}"

    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        return f"ip:{real_ip}"

    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token:
            try:
                payload = decode_access_token(token)
                user_id = payload.get("sub") if isinstance(payload, dict) else None
                if user_id:
                    return f"user:{user_id}"
            except Exception:
                pass

    client_host = request.client.host if request.client else "unknown"
    return f"ip:{client_host}"


def rate_limit(limit_value: str, scope: str):
    max_requests, window_seconds = parse_limit(limit_value)

    async def _dependency(request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return

        identity = _extract_identity(request)
        key = f"{scope}:{identity}"
        retry_after = _limiter.hit(key=key, limit=max_requests, window_seconds=window_seconds)
        if retry_after is None:
            return

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
            headers={"Retry-After": str(math.ceil(retry_after))},
        )

    return _dependency


def rate_limit_from_setting(setting_name: str, scope: str):
    async def _dependency(request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return

        limit_value = getattr(settings, setting_name)
        max_requests, window_seconds = parse_limit(limit_value)
        identity = _extract_identity(request)
        key = f"{scope}:{identity}"
        retry_after = _limiter.hit(key=key, limit=max_requests, window_seconds=window_seconds)
        if retry_after is None:
            return

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
            headers={"Retry-After": str(math.ceil(retry_after))},
        )

    return _dependency
