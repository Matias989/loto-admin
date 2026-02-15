#!/bin/bash
# Script de preparación para desplegar albion-guild-bot en Oracle Cloud (Ubuntu)
# Ejecutar en la VM: chmod +x scripts/oracle-setup.sh && ./scripts/oracle-setup.sh

set -e

echo "==> Actualizando paquetes..."
sudo apt-get update -qq
sudo apt-get install -y -qq build-essential git curl

echo "==> Instalando Node.js 20..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Node: $(node -v) | npm: $(npm -v)"

echo "==> Instalando PM2..."
sudo npm install -g pm2

echo "==> Creando directorio data..."
mkdir -p data

echo ""
echo "=== Listo ==="
echo "Siguiente:"
echo "  1. Copia tu .env: scp .env ubuntu@IP:~/albion-guild/.env"
echo "  2. Copia la BD:  scp data/guild.db ubuntu@IP:~/albion-guild/data/"
echo "  3. npm install && pm2 start src/index.js --name albion-bot"
echo "  4. pm2 save && pm2 startup"
