#!/bin/bash
# Script de Backup Automático
# Ejecutar diariamente a las 11:00 PM

set -e

BACKUP_DIR="/var/backups/crm"
DB_NAME="crm_whatsapp"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/crm_backup_$DATE.dump"
KEEP_DAYS=30

mkdir -p $BACKUP_DIR

echo "============================================"
echo "  BACKUP AUTOMÁTICO"
echo "  Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"

# Crear backup
echo "Creando backup..."
sudo -u postgres pg_dump -Fc $DB_NAME > $BACKUP_FILE

# Verificar tamaño
SIZE=$(du -h $BACKUP_FILE | cut -f1)
echo "✓ Backup creado: $BACKUP_FILE ($SIZE)"

# Comprimir backups antiguos (más de 7 días)
find $BACKUP_DIR -name "*.dump" -mtime +7 -exec gzip {} \;

# Eliminar backups muy antiguos (más de 30 días)
find $BACKUP_DIR -name "*.dump.gz" -mtime +$KEEP_DAYS -delete
echo "✓ Backups antiguos limpiados (>$KEEP_DAYS días)"

# Registrar en base de datos
psql -U crm_admin -d crm_whatsapp -c "
INSERT INTO daily_operations (operation_type, operation_time, stats)
VALUES ('backup', NOW(), '{\"file\": \"$BACKUP_FILE\", \"size\": \"$SIZE\"}'::jsonb);
"

echo "✓ Backup completado exitosamente"
echo "============================================"
