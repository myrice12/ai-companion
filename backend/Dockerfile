ARG PYTHON_IMAGE=python:3.11-slim
FROM ${PYTHON_IMAGE}

WORKDIR /app

COPY requirements.txt .
ARG PIP_INDEX=
RUN if [ -n "$PIP_INDEX" ]; then \
      pip install --no-cache-dir -r requirements.txt -i "$PIP_INDEX"; \
    else \
      pip install --no-cache-dir -r requirements.txt; \
    fi

COPY app ./app

RUN mkdir -p /app/data

ENV DATABASE_URL=sqlite:////app/data/companion.db

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
