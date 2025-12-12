#!/bin/bash

# Script para desplegar forzando la actualización
set -e

echo "=== DESPLIEGUE FORZADO EN AZURE ==="
echo ""

cd /home/azureuser/crm-ngso-whatsapp

# 1. Backup completo
echo "💾 Haciendo backup completo..."
BACKUP_NAME="backup-completo-$(date +%Y%m%d-%H%M%S)"
cp -r backend "$BACKUP_NAME"
echo "✅ Backup: $BACKUP_NAME"
echo ""

# 2. Guardar cambios locales
echo "📦 Guardando cambios locales..."
git stash push -m "Cambios locales antes de despliegue $(date +%Y%m%d-%H%M%S)"
echo "✅ Cambios guardados en stash"
echo ""

# 3. Limpiar archivos no rastreados
echo "🧹 Limpiando archivos no rastreados..."
git clean -fd
echo "✅ Archivos limpiados"
echo ""

# 4. Actualizar código
echo "📥 Actualizando código desde GitHub..."
git fetch origin
git checkout feature/mejoras-crm-bot
git pull origin feature/mejoras-crm-bot
echo "✅ Código actualizado"
echo ""

# 5. Instalar dependencias
echo "📦 Instalando dependencias..."
cd backend
npm install --production
echo "✅ Dependencias instaladas"
echo ""

# 6. Compilar
echo "🔨 Compilando..."
npm run build
echo "✅ Compilación exitosa"
echo ""

# 7. Listar PM2
echo "🔍 Procesos PM2 actuales..."
pm2 list
echo ""

# 8. Reiniciar
echo "🔄 Reiniciando servicios..."
pm2 restart all
sleep 5
echo "✅ Servicios reiniciados"
echo ""

# 9. Estado
echo "📊 Estado de los servicios..."
pm2 status
echo ""

# 10. Logs
echo "📋 Últimas líneas de log..."
pm2 logs --lines 30 --nostream
echo ""

echo "=== ✅ DESPLIEGUE COMPLETADO ==="
echo ""
echo "Backup disponible en: /home/azureuser/crm-ngso-whatsapp/$BACKUP_NAME"
echo ""
echo "Para ver logs en tiempo real:"
echo "  pm2 logs"
echo ""
