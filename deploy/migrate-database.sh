#!/bin/bash
# Script de Migración de Base de Datos
# Ejecutar DESDE el servidor Azure (172.203.16.202)

set -e

NEW_SERVER="72.61.73.9"
DB_NAME="crm_whatsapp"
BACKUP_FILE="crm_backup_$(date +%Y%m%d_%H%M%S).dump"

echo "============================================"
echo "  Migración de Base de Datos"
echo "============================================"
echo ""

echo "[1/4] Creando backup de la base de datos..."
sudo -u postgres pg_dump -Fc $DB_NAME > /tmp/$BACKUP_FILE
echo "✓ Backup creado: /tmp/$BACKUP_FILE"

echo ""
echo "[2/4] Obteniendo tamaño del backup..."
du -h /tmp/$BACKUP_FILE

echo ""
echo "[3/4] Transfiriendo backup al nuevo servidor..."
scp /tmp/$BACKUP_FILE root@$NEW_SERVER:/tmp/

echo ""
echo "[4/4] Restaurando en el nuevo servidor..."
ssh root@$NEW_SERVER << 'ENDSSH'
echo "Restaurando base de datos..."
sudo -u postgres pg_restore -d crm_whatsapp -c --if-exists /tmp/crm_backup_*.dump || true
echo "✓ Base de datos restaurada"

echo "Verificando datos..."
sudo -u postgres psql -d crm_whatsapp -c "
SELECT 
  (SELECT COUNT(*) FROM users) as usuarios,
  (SELECT COUNT(*) FROM debtors) as deudores,
  (SELECT COUNT(*) FROM chats) as chats,
  (SELECT COUNT(*) FROM chat_messages) as mensajes;
"
ENDSSH

echo ""
echo "============================================"
echo "  ✓ Migración de BD completada"
echo "============================================"
