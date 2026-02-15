# Guía de integración - Bot de Gremio Albion

Pasos para integrar el bot en tu servidor de Discord.

---

## 1. Crear la aplicación del bot en Discord

1. Entra a **[Discord Developer Portal](https://discord.com/developers/applications)**
2. Clic en **"New Application"** → pon un nombre (ej. "Albion Gremio Bot")
3. En el menú izquierdo, ve a **"Bot"**
4. Clic en **"Add Bot"**
5. En **"Token"**, clic en **"Reset Token"** y copia el token (guárdalo bien, no lo compartas)

---

## 2. Invitar el bot a tu servidor

1. En el menú izquierdo, ve a **"OAuth2"** → **"URL Generator"**
2. En **SCOPES** marca: `bot`
3. En **BOT PERMISSIONS** marca:
   - Read Messages/View Channels
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - Add Reactions
   - Use Slash Commands (opcional, ya no usamos comandos)
   - Manage Messages (por si se necesita)
4. Copia la URL generada y ábrela en el navegador
5. Elige tu servidor y autoriza

---

## 3. Obtener los IDs necesarios

Activa **Modo desarrollador** en Discord:
- **Ajustes de usuario** → **Avanzado** → Activar **"Modo desarrollador"**

### Obtener IDs:

| Qué necesitas | Cómo |
|---------------|------|
| **ID del servidor** | Clic derecho en el icono del servidor → Copiar ID |
| **ID del canal** | Clic derecho en el canal (ej. #panel-gremio) → Copiar ID |
| **Tu ID de usuario** | Clic derecho en tu nombre (en el chat o miembro) → Copiar ID |

---

## 4. Instalar y configurar el proyecto

```bash
cd albion-guild
npm install
```

Copia el archivo de ejemplo y éditalo:

```bash
cp .env.example .env
```

Abre `.env` y completa:

```env
DISCORD_TOKEN=el_token_que_copiaste_del_portal
GUILD_ID=id_de_tu_servidor
PANEL_CHANNEL_ID=id_del_canal_donde_quieres_el_panel
ADMIN_USER_IDS=tu_id_de_usuario
```

---

## 5. Ejecutar el bot

```bash
npm start
```

Si todo está bien, verás: `Bot iniciado como TuBot#1234`

El bot publicará el **panel principal** en el canal que configuraste. Si no ves el panel, verifica que `PANEL_CHANNEL_ID` sea correcto y que el bot tenga permisos en ese canal.

---

## 6. Usar el bot

1. Ve al canal del panel
2. Haz clic en **"Mi Panel"** o cualquier botón
3. Como admin, verás **"Panel Liderazgo"** para crear eventos, cerrar mazmorras, etc.

---

## Requisitos técnicos

- **Node.js 18 o superior** (`node -v` para comprobar)
- En **Windows**: si `npm install` falla con `better-sqlite3`, instala [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) con el workload "Desktop development with C++"

---

## Despliegue 24/7 (opcional)

Para que el bot esté siempre activo:

- **PC siempre encendida**: usa `npm start` o `npm run dev`
- **Servidor VPS**: instala Node.js, clona el repo, configura `.env` y usa `pm2 start src/index.js` o similar
- **Hosting**: Railway, Render, etc. según tu preferencia
