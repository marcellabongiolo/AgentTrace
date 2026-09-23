FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1     PYTHONUNBUFFERED=1     PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY pyproject.toml README.md ./
COPY agenttrace ./agenttrace

RUN python -m pip install --upgrade pip     && pip install .

RUN mkdir -p /data

EXPOSE 8000

CMD ["uvicorn", "agenttrace.api:app", "--host", "0.0.0.0", "--port", "8000"]
