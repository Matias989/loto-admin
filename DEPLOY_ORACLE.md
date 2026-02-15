# Despliegue en Oracle Cloud Free Tier

Guía paso a paso para desplegar el bot en una VM gratuita de Oracle Cloud, con tus datos actuales de la base de datos.

## Requisitos

- Cuenta en [Oracle Cloud](https://www.oracle.com/cloud/free/)
- Proyecto subido a GitHub/GitLab
- Clave SSH (para conectarte a la VM)

---

## Parte 1: Crear la VM en Oracle Cloud

### 1.1 Acceder al panel

1. Entra en [cloud.oracle.com](https://cloud.oracle.com) e inicia sesión.
2. Menú → **Compute** → **Instances**.
3. Selecciona tu región (la que elegiste al registrarte).

### 1.2 Crear la instancia

1. **Create Instance**.
2. **Name**: `albion-guild-bot` (o el que prefieras).
3. **Placement**: deja la región por defecto.
4. **Image and shape**:
   - **Image**: Ubuntu 22.04 (o 24.04).
   - **Shape**: **VM.Standard.E2.1.Micro** (Always Free).
5. **Add SSH keys**: sube tu clave pública o genera una nueva.
   - En Windows: `ssh-keygen -t rsa -b 4096` y usa el contenido de `~/.ssh/id_rsa.pub`.
6. **Create**.

Anota la **IP pública** de la VM cuando esté en estado *Running*.

### 1.3 Configurar firewall (opcional)

Para tu bot solo hace falta salida a internet. La VM ya tiene acceso por defecto.  
Si usas un firewall extra, permite tráfico saliente (el bot se conecta a Discord).

---

## Parte 2: Preparar datos en tu PC

### 2.1 Backup de la base de datos

En tu PC, en la carpeta del proyecto:

```bash
npm run backup-db
```

O manualmente: `node scripts/backup-database.js`. Esto crea `guild-backup.db` en la raíz. Ese archivo lo subirás al servidor.

### 2.2 Tener listo tu .env

Tu archivo `.env` local tiene las variables. Lo usarás para crear el mismo archivo en el servidor. **No lo subas a Git.**

---

## Parte 3: Conectar y configurar la VM

### 3.1 Conectar por SSH

```bash
ssh -i ruta/a/tu/clave_privada ubuntu@TU_IP_PUBLICA
```

En Windows con PowerShell (si usaste la clave por defecto):

```powershell
ssh ubuntu@TU_IP_PUBLICA
```

### 3.2 Ejecutar el script de setup

Con el repo clonado en la VM, o usando el script que descargamos:

### 3.2 Clonar el repositorio

```bash
cd ~
git clone https://github.com/TU_USUARIO/TU_REPO.git albion-guild
cd albion-guild
```

Sustituye `TU_USUARIO/TU_REPO` por tu repo (ej: `Matias989/loto-admin`).

### 3.3 Ejecutar el script de setup

```bash
chmod +x scripts/oracle-setup.sh
./scripts/oracle-setup.sh
```

El script instala Node.js 20, PM2 y dependencias necesarias para `better-sqlite3`.

### 3.4 Subir .env y la base de datos

**Desde tu PC** (en otra terminal, en la carpeta del proyecto):

```powershell
# Subir .env (usa la ruta correcta a tu clave SSH si aplica)
scp .env ubuntu@TU_IP_PUBLICA:~/albion-guild/.env

# Subir la base de datos
scp guild-backup.db ubuntu@TU_IP_PUBLICA:~/albion-guild/data/guild.db
```

O si `data/` aún no existe en el servidor:

```powershell
scp guild-backup.db ubuntu@TU_IP_PUBLICA:~/albion-guild/
```

Luego en la VM:

```bash
cd ~/albion-guild
mkdir -p data
mv guild-backup.db data/guild.db
```

### 3.5 Instalar dependencias e iniciar

En la VM:

```bash
cd ~/albion-guild
npm install
npm start
```

Para comprobar que arranca bien, deberías ver algo como: `Bot iniciado como TuBot#1234`.

---

## Parte 4: Dejar el bot corriendo 24/7 (PM2)

### 4.1 Instalar PM2 (si no lo hizo el script)

```bash
sudo npm install -g pm2
```

### 4.2 Iniciar el bot con PM2

```bash
cd ~/albion-guild
pm2 start src/index.js --name albion-bot
pm2 save
pm2 startup
```

Sigue las instrucciones que muestre `pm2 startup` (copiar y ejecutar el comando que te da).

### 4.3 Comandos útiles de PM2

| Comando | Descripción |
|---------|-------------|
| `pm2 status` | Ver estado del bot |
| `pm2 logs albion-bot` | Ver logs en tiempo real |
| `pm2 restart albion-bot` | Reiniciar el bot |
| `pm2 stop albion-bot` | Detener el bot |

---

## Parte 5: Registrar comandos slash (una vez)

Desde **tu PC** (con `.env` configurado):

```bash
npm run deploy
```

Con esto se registran `/gremio` y `/configurar` en Discord.

---

## Resumen rápido

1. Crear VM Ubuntu en Oracle Cloud (Always Free).
2. Conectar por SSH.
3. Clonar repo, ejecutar `scripts/oracle-setup.sh`.
4. Subir `.env` y `data/guild.db` con `scp`.
5. `npm install` y `pm2 start src/index.js --name albion-bot`.
6. `pm2 save` y `pm2 startup`.
7. Ejecutar `npm run deploy` desde tu PC.

---

## Solución de problemas

- **Error al compilar better-sqlite3**: El script instala `build-essential`. Si falla: `sudo apt install -y build-essential`.
- **Bot no conecta**: Revisa que `DISCORD_TOKEN` en `.env` del servidor sea correcto.
- **Permiso denegado en data/**: `chmod 755 data && chmod 644 data/guild.db`.
- **Ver logs**: `pm2 logs albion-bot`.
