#!/bin/bash
# Configuración de Cron Jobs para Operaciones Diarias
# Ejecutar EN el nuevo servidor

echo "Configurando cron jobs para operaciones diarias..."

# Crear entrada en crontab
(crontab -l 2>/dev/null; cat << 'CRON'
# CRM NGS&O - Operaciones Diarias

# Apertura del sistema - 8:00 AM (Lunes a Viernes)
0 8 * * 1-5 cd /var/www/crm-ngso-whatsapp/backend && node scripts/daily-opening.js >> /var/log/crm-opening.log 2>&1

# Cierre del sistema - 6:00 PM (Lunes a Viernes)
0 18 * * 1-5 cd /var/www/crm-ngso-whatsapp/backend && node scripts/daily-closing.js >> /var/log/crm-closing.log 2>&1

# Backup automático - 11:00 PM (Todos los días)
0 23 * * * /var/www/crm-ngso-whatsapp/deploy/daily-backup.sh >> /var/log/crm-backup.log 2>&1

# Renovación SSL - 2:00 AM (Todos los días)
0 2 * * * certbot renew --quiet --post-hook "systemctl reload nginx"

# Limpieza de logs - 3:00 AM (Domingos)
0 3 * * 0 find /var/log -name "crm-*.log" -mtime +60 -delete

CRON
) | crontab -

echo "✓ Cron jobs configurados:"
echo ""
crontab -l | grep -A 20 "CRM NGS&O"

echo ""
echo "Creando archivos de log..."
touch /var/log/crm-opening.log
touch /var/log/crm-closing.log
touch /var/log/crm-backup.log
chmod 644 /var/log/crm-*.log

echo ""
echo "✓ Configuración completada"
echo ""
echo "Para verificar los logs:"
echo "  - Apertura: tail -f /var/log/crm-opening.log"
echo "  - Cierre: tail -f /var/log/crm-closing.log"
echo "  - Backup: tail -f /var/log/crm-backup.log"
