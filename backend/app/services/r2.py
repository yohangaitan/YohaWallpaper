"""
services/r2.py
--------------
Cliente para Cloudflare R2 (compatible con S3 API via boto3).
Sube archivos de video y retorna la URL pública.
"""

import boto3
from botocore.exceptions import ClientError

from app.config import settings


def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )


def upload_video(file_bytes: bytes, filename: str, content_type: str) -> str:
    """
    Sube un video a R2 y retorna su URL pública.
    filename debe ser único (ej: 'animated/wallpaper-abc123.mp4')
    """
    client = get_r2_client()
    try:
        client.put_object(
            Bucket=settings.r2_bucket_name,
            Key=filename,
            Body=file_bytes,
            ContentType=content_type,
        )
    except ClientError as e:
        raise RuntimeError(f"R2 upload failed: {e}") from e

    return f"{settings.r2_public_url}/{filename}"


def delete_video(filename: str) -> None:
    """Elimina un video de R2 por su key."""
    client = get_r2_client()
    try:
        client.delete_object(Bucket=settings.r2_bucket_name, Key=filename)
    except ClientError as e:
        raise RuntimeError(f"R2 delete failed: {e}") from e