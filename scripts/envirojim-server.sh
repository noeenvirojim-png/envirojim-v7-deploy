#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE=(docker compose --env-file .env.production -f compose.production.yml)

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Missing $1"
    exit 1
  fi
}

validate_env() {
  require_file .env.production
  local required=(
    APP_DOMAIN
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY
    GEMINI_API_KEY
  )

  for key in "${required[@]}"; do
    local value
    value="$(grep -E "^${key}=" .env.production | tail -n 1 | cut -d= -f2-)"
    if [[ -z "$value" || "$value" == replace_* || "$value" == *example.com* ]]; then
      echo "Invalid or missing ${key} in .env.production"
      exit 1
    fi
  done
}

require_docker() {
  command -v docker >/dev/null 2>&1 || { echo "Docker is not installed"; exit 1; }
  docker info >/dev/null 2>&1 || { echo "Docker is not running"; exit 1; }
}

install_app() {
  require_docker
  validate_env
  "${COMPOSE[@]}" config >/dev/null
  "${COMPOSE[@]}" up -d --build --remove-orphans
  "${COMPOSE[@]}" ps
}

update_app() {
  require_docker
  validate_env
  git pull --ff-only
  "${COMPOSE[@]}" up -d --build --remove-orphans
  "${COMPOSE[@]}" ps
}

status_app() {
  require_docker
  validate_env
  "${COMPOSE[@]}" ps
  "${COMPOSE[@]}" logs --tail=80 app
}

stop_app() {
  require_docker
  validate_env
  "${COMPOSE[@]}" down
}

case "${1:-}" in
  install) install_app ;;
  update) update_app ;;
  status) status_app ;;
  stop) stop_app ;;
  *)
    echo "Usage: bash scripts/envirojim-server.sh {install|update|status|stop}"
    exit 1
    ;;
esac
