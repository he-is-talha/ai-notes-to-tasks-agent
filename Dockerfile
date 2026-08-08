FROM node:24-bookworm

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json vitest.config.ts ./
COPY src ./src
COPY tests ./tests
COPY samples ./samples
COPY data/.gitkeep ./data/.gitkeep
COPY audit/.gitkeep ./audit/.gitkeep
COPY .env.example .env

ENV NODE_ENV=production
ENV ADAPTER=sqlite
ENV SQLITE_PATH=data/tasks.db
ENV OLLAMA_HOST=http://ollama:11434
ENV OLLAMA_MODEL=qwen3.5:4b
ENV MAX_TOOL_CALLS=6

CMD ["npm", "run", "demo:dry-run"]

