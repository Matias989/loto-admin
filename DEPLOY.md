# Despliegue en Fly.io

Guía paso a paso para desplegar el bot en Fly.io (gratis, con persistencia).

## Requisitos

- Cuenta en [Fly.io](https://fly.io/app/sign-up)
- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) instalado
- Variables del bot listas (.env local como referencia)

## 1. Instalar Fly CLI

**Windows (PowerShell):**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

**Mac/Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

## 2. Iniciar sesión

```bash
flyctl auth login
```

## 3. Crear la app y el volumen

Desde la carpeta del proyecto:

```bash
flyctl launch --no-deploy
```

Cuando pregunte:
- **App name**: albion-guild-bot (o el que prefieras)
- **Region**: mad (Madrid) o la más cercana
- **PostgreSQL/Redis**: No

Luego crea el volumen (reemplaza `albion-guild-bot` si usaste otro nombre):

```bash
flyctl volumes create data --size 1 --region mad --app albion-guild-bot
```

## 4. Configurar secretos (variables de entorno)

**Opción A - Desde .env:**
- **Windows (PowerShell):** `.\scripts\fly-secrets.ps1`
- **Linux/Mac:** `chmod +x scripts/fly-secrets.sh && ./scripts/fly-secrets.sh albion-guild-bot`

**Opción B - Manualmente:**
```bash
flyctl secrets set DISCORD_TOKEN=tu_token --app albion-guild-bot
flyctl secrets set GUILD_ID=tu_guild_id --app albion-guild-bot
flyctl secrets set PANEL_CHANNEL_ID=tu_canal_id --app albion-guild-bot
flyctl secrets set ADMIN_USER_IDS=tu_user_id --app albion-guild-bot
flyctl secrets set LEADER_ROLE_IDS=id_rol --app albion-guild-bot
```

**Opcionales:** EVENTS_CHANNEL_ID, EVENTS_CHANNEL_LOOT_ID, EVENTS_ANNOUNCE_ROLE_ID, FUND_PERCENTAGE_DEFAULT

## 5. Desplegar

```bash
flyctl deploy --app albion-guild-bot
```

## 6. Registrar comandos slash (una vez)

Desde tu PC (con .env configurado):

```bash
npm run deploy
```

## 7. Ver logs

```bash
flyctl logs --app albion-guild-bot
```

Deberías ver: `Bot iniciado como TuBot#1234`

## 8. Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `flyctl status` | Estado de la app |
| `flyctl logs` | Ver logs en tiempo real |
| `flyctl secrets list` | Listar variables |
| `flyctl ssh console` | Conectar por SSH |
| `flyctl destroy` | Eliminar la app |

## Región

Si `mad` no está disponible, prueba: `cdg` (París), `lhr` (Londres), `iad` (Virginia).

## Solución de problemas

- **Error de volumen**: Verifica que el volumen existe: `flyctl volumes list`
- **App no inicia**: Revisa `flyctl logs` para ver el error
- **Token inválido**: Regenera el token en Discord Developer Portal y actualiza: `flyctl secrets set DISCORD_TOKEN=nuevo_token`
