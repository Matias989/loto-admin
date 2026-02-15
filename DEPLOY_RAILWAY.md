# Despliegue en Railway

Guía para desplegar el bot en [Railway](https://railway.app) (~5 USD/mes). La app corre tal como está, con SQLite persistente.

## Requisitos

- Cuenta en [Railway](https://railway.app)
- Repo en GitHub (o GitLab/Bitbucket)
- Variables del bot listas (.env local como referencia)

---

## 1. Crear proyecto en Railway

1. Entra en [railway.app](https://railway.app) e inicia sesión.
2. **New Project** → **Deploy from GitHub repo**.
3. Conecta GitHub si no lo has hecho y selecciona tu repo.
4. Railway detecta Node.js y hace el primer deploy (fallará hasta configurar variables y volumen).

---

## 2. Configurar variables de entorno

En el proyecto → tu servicio → pestaña **Variables**:

| Variable | Valor | Obligatorio |
|----------|-------|-------------|
| `DISCORD_TOKEN` | Tu token del bot | Sí |
| `GUILD_ID` | ID del servidor Discord | Sí |
| `PANEL_CHANNEL_ID` | ID del canal del panel | Sí |
| `ADMIN_USER_IDS` | IDs separados por coma | Sí |
| `LEADER_ROLE_IDS` | IDs de roles líder | Sí |
| `DATA_DIR` | `/data` | Sí (para el volumen) |
| `EVENTS_CHANNEL_ID` | ID canal eventos | Opcional |
| `EVENTS_CHANNEL_LOOT_ID` | ID canal loot | Opcional |
| `EVENTS_ANNOUNCE_ROLE_ID` | ID rol anuncios | Opcional |
| `FUND_PERCENTAGE_DEFAULT` | `0.05` | Opcional |

**Importante:** `DATA_DIR` debe ser `/data` para usar el volumen persistente.

---

## 3. Añadir volumen para la base de datos

1. En tu servicio → pestaña **Volumes** (o **Settings** → **Volumes**).
2. **Add Volume**.
3. **Mount Path:** `/data`
4. **Size:** 1 GB (suficiente).
5. Guarda.

Railway montará el volumen en `/data`. El bot guardará `guild.db` ahí y los datos persistirán entre deploys.

---

## 4. Datos existentes (opcional)

Si tienes `data/guild.db` con datos importantes:

1. **Backup local:** `npm run backup-db` (crea `guild-backup.db`).
2. Railway no permite subir archivos directamente al volumen desde fuera. Opciones:
   - **Empezar desde cero:** el bot creará una BD vacía. Útil si aún no hay datos críticos.
   - **Railway CLI:** instala `@railway/cli`, vincula el proyecto y usa `railway run` para ejecutar un script que lea desde stdin o desde una URL. La documentación de Railway tiene ejemplos actualizados.

---

## 5. Redeploy

Tras configurar variables y volumen:

1. **Deploy** → **Redeploy** (o haz un push al repo).
2. Revisa los logs; deberías ver: `Bot iniciado como TuBot#1234`.

---

## 6. Registrar comandos slash (una vez)

Desde tu PC, con `.env` configurado:

```bash
npm run deploy
```

---

## Resumen rápido

1. New Project → Deploy from GitHub.
2. Variables: añade todas las de `.env` y `DATA_DIR=/data`.
3. Volumes: monta un volumen en `/data`.
4. Redeploy.
5. `npm run deploy` en local para comandos slash.

---

## Comandos útiles

| Acción | Dónde |
|--------|-------|
| Ver logs | Dashboard → servicio → Logs |
| Variables | Dashboard → servicio → Variables |
| Volumen | Dashboard → servicio → Volumes |
| Redeploy | Dashboard → Deploy → Redeploy |

---

## Solución de problemas

- **Error al compilar better-sqlite3:** Railway usa Nixpacks que incluye build-essential. Si falla, contacta soporte.
- **Datos perdidos:** Comprueba que el volumen está montado en `/data` y que `DATA_DIR=/data`.
- **Bot no conecta:** Verifica `DISCORD_TOKEN` en Variables.
