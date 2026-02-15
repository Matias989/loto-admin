#!/bin/bash
# Configura los secretos en Fly.io desde .env local
# Uso: ./scripts/fly-secrets.sh [app-name]
# Requiere: .env en la raíz del proyecto

set -e
APP="${1:-albion-guild-bot}"
ENV_FILE="../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "No se encontró .env. Cópialo desde .env.example y complétalo."
  exit 1
fi

echo "Configurando secretos para app: $APP"
echo ""

source "$ENV_FILE" 2>/dev/null || export $(grep -v '^#' "$ENV_FILE" | xargs)

[ -n "$DISCORD_TOKEN" ] && flyctl secrets set DISCORD_TOKEN="$DISCORD_TOKEN" --app "$APP"
[ -n "$GUILD_ID" ] && flyctl secrets set GUILD_ID="$GUILD_ID" --app "$APP"
[ -n "$PANEL_CHANNEL_ID" ] && flyctl secrets set PANEL_CHANNEL_ID="$PANEL_CHANNEL_ID" --app "$APP"
[ -n "$ADMIN_USER_IDS" ] && flyctl secrets set ADMIN_USER_IDS="$ADMIN_USER_IDS" --app "$APP"
[ -n "$LEADER_ROLE_IDS" ] && flyctl secrets set LEADER_ROLE_IDS="$LEADER_ROLE_IDS" --app "$APP"
[ -n "$EVENTS_CHANNEL_ID" ] && flyctl secrets set EVENTS_CHANNEL_ID="$EVENTS_CHANNEL_ID" --app "$APP"
[ -n "$EVENTS_CHANNEL_LOOT_ID" ] && flyctl secrets set EVENTS_CHANNEL_LOOT_ID="$EVENTS_CHANNEL_LOOT_ID" --app "$APP"
[ -n "$EVENTS_ANNOUNCE_ROLE_ID" ] && flyctl secrets set EVENTS_ANNOUNCE_ROLE_ID="$EVENTS_ANNOUNCE_ROLE_ID" --app "$APP"
[ -n "$FUND_PERCENTAGE_DEFAULT" ] && flyctl secrets set FUND_PERCENTAGE_DEFAULT="$FUND_PERCENTAGE_DEFAULT" --app "$APP"

echo ""
echo "Secrets configurados. Ejecuta: flyctl deploy --app $APP"
