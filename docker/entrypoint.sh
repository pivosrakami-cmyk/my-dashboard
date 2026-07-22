#!/bin/sh
set -e

# Источник данных — git-репозиторий вольта (read-only).
# На сервере VAULT_PATH указывает на клон этого репо.
VAULT_PATH="${VAULT_PATH:-/data/vault}"
INTERVAL="${VAULT_PULL_INTERVAL:-120}"

# Собираем URL с токеном (read-only), если задан
repo_url() {
  if [ -n "$VAULT_GIT_TOKEN" ]; then
    echo "https://x-access-token:${VAULT_GIT_TOKEN}@github.com/${VAULT_REPO}.git"
  else
    echo "https://github.com/${VAULT_REPO}.git"
  fi
}

if [ -n "$VAULT_REPO" ]; then
  if [ ! -d "$VAULT_PATH/.git" ]; then
    echo "[vault] клонирую $VAULT_REPO → $VAULT_PATH"
    git clone --depth 1 "$(repo_url)" "$VAULT_PATH" || echo "[vault] clone не удался"
  fi

  # Фоновый цикл: тянем свежие файлы каждые INTERVAL секунд
  (
    while true; do
      sleep "$INTERVAL"
      git -C "$VAULT_PATH" pull --quiet --no-rebase 2>/dev/null || true
    done
  ) &
fi

export VAULT_PATH
echo "[vault] источник: $VAULT_PATH (обновление каждые ${INTERVAL}с)"
exec node server.js
