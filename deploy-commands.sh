#!/bin/bash

# Script para ejecutar en el servidor Azure
# Ejecutar con: bash deploy-commands.sh

set -e  # Salir si algún comando falla

echo "=== DESPLIEGUE AUTOMÁTICO EN AZURE ==="
echo ""

# 1. Verificar ubicación
echo "📍 Verificando directorio..."
if [ ! -d "/home/azureuser/crm-ngso-whatsapp" ]; then
    echo "❌ Error: No se encuentra el directorio del proyecto"
    exit 1
fi

cd /home/azureuser/crm-ngso-whatsapp
echo "✅ Directorio: $(pwd)"
echo ""

# 2. Backup del código actual
echo "💾 Haciendo backup del código actual..."
BACKUP_NAME="backend-backup-$(date +%Y%m%d-%H%M%S)"
cp -r backend "$BACKUP_NAME"
echo "✅ Backup creado: $BACKUP_NAME"
echo ""

# 3. Obtener cambios del repositorio
echo "📥 Obteniendo cambios del repositorio..."
git fetch origin
git checkout feature/mejoras-crm-bot
git pull origin feature/mejoras-crm-bot
echo "✅ Código actualizado desde GitHub"
echo ""

# 4. Instalar dependencias
echo "📦 Instalando dependencias..."
cd backend
npm install --production
echo "✅ Dependencias instaladas"
echo ""

# 5. Compilar
echo "🔨 Compilando el backend..."
npm run build
echo "✅ Compilación exitosa"
echo ""

# 6. Reiniciar PM2
echo "🔄 Reiniciando servicios..."
pm2 list
echo ""
echo "Reiniciando procesos PM2..."
pm2 restart all
echo "✅ Servicios reiniciados"
echo ""

# 7. Verificar estado
echo "🔍 Verificando estado de los servicios..."
sleep 5
pm2 status
echo ""

# 8. Verificar logs
echo "📋 Últimas líneas de log..."
pm2 logs --lines 20 --nostream
echo ""

# 9. Test de salud
echo "🏥 Verificando endpoint de salud..."
sleep 2
curl -s http://localhost:3000/health || echo "⚠️ Endpoint de salud no responde"
echo ""

echo ""
echo "=== DESPLIEGUE COMPLETADO ==="
echo ""
echo "✅ Cambios desplegados:"
echo "   - Normalización de teléfonos en bot"
echo "   - Corrección de variables literales"
echo "   - Mejoras en módulo de deudores"
echo ""
echo "🔍 Para monitorear en tiempo real:"
echo "   pm2 logs"
echo ""
echo "🔄 Para reiniciar un servicio específico:"
echo "   pm2 restart crm-backend"
echo ""
echo "💾 Backup disponible en:"
echo "   /home/azureuser/crm-ngso-whatsapp/$BACKUP_NAME"
echo ""
