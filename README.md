# Bot de Gestión de Gremio - Albion Online

Bot profesional de Discord para organizar y gestionar gremios de Albion Online. Incluye sistema de eventos, puntos, beneficios, fondo del gremio y rangos automáticos.

## Características

- **Registro de usuarios** con Discord (nombre único, sin contraseñas)
- **Panel principal** con botones interactivos
- **Sistema de eventos** (Mazmorra, Avalonian, ZvZ, Hellgate, Recolección)
- **Repartición automática de loot** en mazmorras (ingresar total en silver, se reparte entre asistentes)
- **Cuenta corriente** por participante (balance en silver, historial de movimientos)
- **Descuentos** al entregar la parte en juego (actualiza la cuenta automáticamente)
- **Sistema de puntos** por participación
- **Beneficios canjeables** con puntos
- **Fondo del gremio** con registro de ingresos/egresos
- **Rangos automáticos** según actividad
- **Panel de liderazgo** para oficiales
- **Estadísticas** de actividad

## Requisitos

- **Node.js 18+** (obligatorio)
- Cuenta de Discord con bot
- En Windows: herramientas de compilación (Visual Studio Build Tools con "Desktop development with C++")

## Instalación e integración

**Ver [GUIA_INTEGRACION.md](GUIA_INTEGRACION.md)** para la guía paso a paso de integración en tu servidor.

Resumen rápido:

```bash
npm install
cp .env.example .env
# Edita .env: DISCORD_TOKEN, GUILD_ID, PANEL_CHANNEL_ID, ADMIN_USER_IDS
npm start
```

## Configuración (.env)

| Variable | Descripción |
|----------|-------------|
| DISCORD_TOKEN | Token del bot (Discord Developer Portal) |
| GUILD_ID | ID del servidor de Discord |
| PANEL_CHANNEL_ID | ID del canal donde se muestra el panel |
| EVENTS_CHANNEL_ID | (Opcional) Canal para publicar eventos |
| ADMIN_USER_IDS | IDs de usuarios admin (tu ID para acceso inicial). Ver abajo. |
| LEADER_ROLE_IDS | IDs de roles de Discord (Líder/Oficial) |

### Cómo darte acceso admin

**Opción 1 – Por ID de usuario (rápida):**
1. En Discord: Ajustes → Avanzado → Activa **Modo desarrollador**
2. Clic derecho en tu usuario (o en tu nombre en el chat) → **Copiar ID**
3. Añade en `.env`: `ADMIN_USER_IDS=tu_id_aqui` (varios separados por coma)

**Opción 2 – Por rol de Discord:**
1. Crea un rol en el servidor (ej. "Oficial" o "Líder")
2. Clic derecho en el rol → Copiar ID
3. En `.env`: `LEADER_ROLE_IDS=id_del_rol`
4. Asigna ese rol a los usuarios que quieras que sean admin

**Opción 3 – Dueño del servidor:**
El dueño del servidor de Discord siempre tiene acceso al Panel Liderazgo.

**Opción 4 – Desde el panel (si ya entras):**
Panel Liderazgo → Config → pega tu ID en "IDs usuarios admin"

## Uso

```bash
# Registrar comandos slash (una vez)
npm run deploy

# Iniciar el bot
npm start

# Modo desarrollo (reinicio automático)
npm run dev
```

## Todo por interfaz (sin comandos)

Todas las acciones se realizan mediante **botones**, **menús desplegables** y **formularios** en el panel:

| Acción | Dónde |
|--------|-------|
| Registrarse | Botón en panel principal |
| Crear evento | Panel Liderazgo → Crear evento |
| Cerrar evento | Panel Liderazgo → Cerrar evento (select evento → asistentes → loot) |
| Ajustar puntos | Panel Liderazgo → Ajustar puntos |
| Descontar cuenta | Panel Liderazgo → Descontar |
| Nuevo beneficio | Panel Liderazgo → Nuevo beneficio |
| Fondos ingreso/egreso | Panel Liderazgo → Fondos |
| Configuración | Panel Liderazgo → Config |
| Estadísticas | Panel Liderazgo → Estadísticas |

## Flujo de uso

1. Los usuarios hacen clic en **Registrarse** (captura su Discord automáticamente)
2. Interactúan con el panel: **Mi Panel**, **Eventos**, etc.
3. Se unen a eventos con un clic
4. Oficiales: **Panel Liderazgo** → **Crear evento** (formulario)
5. Al finalizar una mazmorra: **Cerrar evento** → seleccionar evento → asistentes → ingresar loot
6. Al entregar silver en juego: **Descontar** → seleccionar usuario → monto y razón

## Estructura del proyecto

```
src/
├── index.js          # Entrada principal
├── deploy-commands.js
├── commands/         # Slash commands
├── database/         # SQLite y servicios
├── handlers/          # Interacciones y panel
└── utils/             # Embeds y componentes
```
