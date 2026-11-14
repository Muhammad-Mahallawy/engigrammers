FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.18.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN CI=1 pnpm install --frozen-lockfile

COPY backend ./backend
RUN python3 -m venv /opt/flowtrace-venv \
  && /opt/flowtrace-venv/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/flowtrace-venv/bin/pip install --no-cache-dir -r backend/requirements.txt

COPY . .
RUN chmod +x scripts/start-production.sh && pnpm build

ENV NODE_ENV=production
ENV PORT=3000
ENV PYTHONUNBUFFERED=1
EXPOSE 3000

ENTRYPOINT ["/app/scripts/start-production.sh"]
