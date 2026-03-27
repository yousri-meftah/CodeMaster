FROM python:3.11-alpine

WORKDIR /backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apk add --no-cache dos2unix openjdk21-jre-headless \
    && addgroup -S app && adduser -S -G app app \
    && pip install --upgrade pip

COPY requirements.txt /backend/requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY . /backend

RUN dos2unix /backend/docker/entrypoint.sh \
    && chmod +x /backend/docker/entrypoint.sh \
    && chown -R app:app /backend

ENV PYTHONPATH=/backend

USER app

EXPOSE 8000

CMD ["sh", "docker/entrypoint.sh"]
