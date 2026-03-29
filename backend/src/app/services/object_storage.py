import io
from functools import lru_cache

import boto3
from botocore.client import Config

from config import settings


class ObjectStorageError(RuntimeError):
    pass


def r2_is_configured() -> bool:
    return bool(
        settings.R2_BUCKET
        and settings.R2_ACCESS_KEY_ID
        and settings.R2_SECRET_ACCESS_KEY
        and settings.R2_ENDPOINT_URL
    )


@lru_cache(maxsize=1)
def _get_r2_client():
    if not r2_is_configured():
        raise ObjectStorageError("R2 storage is not configured")

    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name=settings.R2_REGION,
        config=Config(signature_version="s3v4"),
    )


def upload_interview_media(*, object_key: str, content: bytes, content_type: str) -> None:
    client = _get_r2_client()
    try:
        client.upload_fileobj(
            io.BytesIO(content),
            settings.R2_BUCKET,
            object_key,
            ExtraArgs={
                "ContentType": content_type,
            },
        )
    except Exception as exc:
        raise ObjectStorageError("Failed to upload media to object storage") from exc


def generate_interview_media_download_url(object_key: str, expires_in: int | None = None) -> str:
    client = _get_r2_client()
    ttl_seconds = expires_in or settings.R2_PRESIGNED_URL_TTL_SECONDS
    try:
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.R2_BUCKET, "Key": object_key},
            ExpiresIn=ttl_seconds,
        )
    except Exception as exc:
        raise ObjectStorageError("Failed to generate media download URL") from exc
