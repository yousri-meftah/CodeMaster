from __future__ import annotations

from email.message import EmailMessage
from email.utils import formataddr
import smtplib

from config import settings


def send_email(
    *,
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
    from_email: str | None = None,
    from_name: str | None = None,
) -> None:
    if not settings.MAIL_SEND_ENABLED:
        raise RuntimeError("Email sending is disabled by configuration")

    effective_from_email = (from_email or settings.MAIL_FROM).strip()
    effective_from_name = (from_name or settings.MAIL_FROM_NAME).strip()

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((effective_from_name, effective_from_email))
    message["To"] = to_email
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    port = int(settings.MAIL_PORT)
    with smtplib.SMTP(settings.MAIL_SERVER, port, timeout=20) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.send_message(message)
