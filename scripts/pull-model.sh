#!/usr/bin/env bash
set -euo pipefail

MODEL="${OLLAMA_MODEL:-qwen3.5:4b}"

if docker compose ps ollama >/dev/null 2>&1; then
  echo "Pulling ${MODEL} into compose ollama service..."
  docker compose exec ollama ollama pull "${MODEL}"
else
  echo "Pulling ${MODEL} via local ollama CLI..."
  ollama pull "${MODEL}"
fi
