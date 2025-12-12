# 🚀 Guía Rápida de Despliegue en Hostinger

## Opción 1: Despliegue Automatizado desde Windows

### Paso 1: Preparar Configuración

1. **Obtener IP del VPS Hostinger:**
   - Ir a https://hpanel.hostinger.com
   - Copiar la IP de tu VPS

2. **Agregar Clave SSH al Panel:**
   - En Hostinger Panel → VPS → Configuración → Acceso SSH
   - Agregar tu clave pública (ya está en el sistema)

### Paso 2: Ejecutar Script de Despliegue

```powershell
# Abrir PowerShell como Administrador
cd d:\crm-ngso-whatsapp

# Ejecutar script de despliegue
.\deploy-from-windows.ps1
```

El script te pedirá la IP del servidor y hará todo automáticamente:
- ✅ Compilar backend y frontend
- ✅ Crear archivo comprimido
- ✅ Subir al servidor
- ✅ Descomprimir y configurar
- ✅ Reiniciar servicios

### Paso 3: Configuración Inicial en Servidor (Solo Primera Vez)

```powershell
# Conectar al servidor
ssh -i "C:\Users\alejo\.ssh\key_vps" root@TU_IP_HOSTINGER

# Ejecutar script de instalación completa
bash /root/crm-ngso-whatsapp/deploy-hostinger.sh
```

Este script instalará:
- Node.js 20.x
- PostgreSQL 15
- Redis
- PM2
- Nginx
- Certbot (SSL)

### Paso 4: Configurar SSL

```bash
# Una vez en el servidor
bash /root/crm-ngso-whatsapp/setup-ssl-hostinger.sh
```

---

## Opción 2: Despliegue Manual Paso a Paso

### Paso 1: Conectar al Servidor

```powershell
ssh -i "C:\Users\alejo\.ssh\key_vps" root@TU_IP_HOSTINGER
```

### Paso 2: Instalar Dependencias

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL 15
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib-15

# Instalar Redis
sudo apt install -y redis-server

# Instalar PM2
sudo npm install -g pm2

# Instalar Nginx
sudo apt install -y nginx

# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### Paso 3: Configurar Base de Datos

```bash
# Cambiar a usuario postgres
sudo -u postgres psql

# Ejecutar en psql:
CREATE DATABASE crm_whatsapp;
CREATE USER crm_admin WITH ENCRYPTED PASSWORD 'TuPasswordSeguro2024!';
GRANT ALL PRIVILEGES ON DATABASE crm_whatsapp TO crm_admin;
ALTER DATABASE crm_whatsapp OWNER TO crm_admin;
\q
```

### Paso 4: Clonar Repositorio

```bash
cd ~
git clone https://github.com/sanalejo720/crm-bot-ngso.git crm-ngso-whatsapp
cd crm-ngso-whatsapp
git checkout feature/mejoras-crm-bot
```

### Paso 5: Configurar Backend

```bash
cd ~/crm-ngso-whatsapp/backend

# Crear .env.production (ver archivo de ejemplo en guía completa)
nano .env.production

# Instalar dependencias
npm install

# Compilar
npm run build

# Iniciar con PM2
pm2 start dist/main.js --name crm-backend --env production
pm2 save
pm2 startup
```

### Paso 6: Configurar Frontend

```bash
cd ~/crm-ngso-whatsapp/frontend

# Crear .env.production
nano .env.production

# Instalar dependencias
npm install

# Compilar
npm run build
```

### Paso 7: Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/crm-ngso
# Copiar configuración de la guía completa

sudo ln -s /etc/nginx/sites-available/crm-ngso /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Paso 8: Configurar SSL

```bash
sudo certbot --nginx -d ngso-chat.assoftware.xyz
```

---

## 📋 Checklist Rápido

### Antes de Desplegar
- [ ] Cuenta Hostinger VPS activa
- [ ] IP del VPS obtenida
- [ ] Clave SSH agregada al panel de Hostinger
- [ ] Dominio apuntando a la IP del VPS
- [ ] Conexión SSH probada

### Despliegue Inicial
- [ ] Ejecutar `deploy-from-windows.ps1` (o despliegue manual)
- [ ] Ejecutar `deploy-hostinger.sh` en el servidor
- [ ] Configurar SSL con `setup-ssl-hostinger.sh`
- [ ] Verificar que todo funciona

### Actualizaciones Futuras
- [ ] Ejecutar `deploy-from-windows.ps1`
- [ ] Verificar logs: `pm2 logs crm-backend`
- [ ] Verificar estado: `pm2 status`

---

## 🔧 Comandos Útiles

```bash
# Ver logs del backend
pm2 logs crm-backend

# Reiniciar backend
pm2 restart crm-backend

# Ver estado
pm2 status

# Monitoreo en tiempo real
pm2 monit

# Ver logs de Nginx
sudo tail -f /var/log/nginx/crm-error.log

# Verificar SSL
sudo certbot certificates

# Backup de base de datos
PGPASSWORD="password" pg_dump -U crm_admin -h localhost crm_whatsapp > backup.sql
```

---

## 📞 Información de Contacto

**URLs:**
- Frontend: https://ngso-chat.assoftware.xyz
- Backend API: https://ngso-chat.assoftware.xyz/api/v1
- Swagger Docs: https://ngso-chat.assoftware.xyz/api/docs

**Credenciales por Defecto:**
- Email: admin@crm.com
- Password: (configurar en primer inicio)

**SSH:**
- Usuario: root
- Clave: C:\Users\alejo\.ssh\key_vps
- IP: (configurar según tu VPS)

---

## 🆘 Solución de Problemas Comunes

### Error: Cannot connect to PostgreSQL
```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql
```

### Error: Backend no inicia
```bash
pm2 logs crm-backend --lines 100
cd ~/crm-ngso-whatsapp/backend
npm install
npm run build
pm2 restart crm-backend
```

### Error 502 Bad Gateway
```bash
pm2 status
sudo nginx -t
sudo systemctl reload nginx
```

### SSL no funciona
```bash
# Verificar DNS
nslookup ngso-chat.assoftware.xyz

# Renovar certificado
sudo certbot renew --force-renewal
```

---

## 📚 Documentación Completa

Para instrucciones detalladas, ver:
- **GUIA_DESPLIEGUE_HOSTINGER.md** - Guía completa paso a paso
- **README.md** - Información general del proyecto
- **ESTADO_PROYECTO.md** - Estado actual del desarrollo

---

**Desarrollado por:** AS Software - Alejandro Sandoval  
**Fecha:** Diciembre 2025
