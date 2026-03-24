FROM python:3.11-alpine

WORKDIR /backend

RUN pip install --upgrade pip

COPY requirements.txt /backend/requirements.txt

RUN pip install -r requirements.txt

COPY . /backend

ENV PYTHONPATH=/backend

EXPOSE 8000

CMD ["sh", "docker/entrypoint.sh"]
