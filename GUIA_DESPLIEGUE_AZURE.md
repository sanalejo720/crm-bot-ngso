# Guía de Despliegue en Azure - CRM NGSO WhatsApp

## 📋 Requisitos Previos

1. Cuenta de Azure activa
2. Azure CLI instalado localmente
3. Acceso SSH configurado
4. Dominio personalizado (opcional pero recomendado)

---

## 🚀 PARTE 1: Crear Máquina Virtual en Azure

### 1.1 Especificaciones Recomendadas de VM

**Para producción:**
- **Tamaño**: Standard_B2s o Standard_B2ms
  - 2 vCPUs
  - 4-8 GB RAM
  - 30 GB SSD
- **Sistema Operativo**: Ubuntu Server 22.04 LTS
- **Región**: Seleccionar la más cercana a tus usuarios (ej: East US, Brazil South)

### 1.2 Crear VM desde Azure Portal

1. **Iniciar sesión en Azure Portal**: https://portal.azure.com

2. **Crear Máquina Virtual**:
   ```
   - Ir a "Máquinas virtuales" → "Crear" → "Máquina virtual de Azure"
   ```

3. **Configuración Básica**:
   - **Suscripción**: Selecciona tu suscripción
   - **Grupo de recursos**: Crear nuevo → `rg-crm-ngso-prod`
   - **Nombre de VM**: `vm-crm-ngso-prod`
   - **Región**: `East US` (o la más cercana)
   - **Opciones de disponibilidad**: Sin redundancia de infraestructura necesaria
   - **Imagen**: `Ubuntu Server 22.04 LTS - Gen2`
   - **Tamaño**: `Standard_B2ms` (2 vCPUs, 8 GB RAM)

4. **Cuenta de Administrador**:
   - **Tipo de autenticación**: Clave pública SSH
   - **Nombre de usuario**: `azureuser`
   - **Origen de clave pública SSH**: Generar nuevo par de claves
   - **Nombre del par de claves**: `crm-ngso-ssh-key`
   - ⚠️ **IMPORTANTE**: Descargar y guardar la clave privada `.pem`

5. **Reglas de puerto de entrada**:
   - Seleccionar: `SSH (22)`, `HTTP (80)`, `HTTPS (443)`

6. **Discos**:
   - **Tipo de disco del SO**: Premium SSD (recomendado)
   - **Tamaño**: 30 GB (suficiente para la aplicación)

7. **Redes**:
   - **Red virtual**: Crear nueva → `vnet-crm-ngso`
   - **Subred**: default
   - **IP pública**: Crear nueva → `ip-crm-ngso-prod`
   - **Grupo de seguridad de red**: Básico
   - Puertos: 22, 80, 443

8. **Administración**:
   - **Identidad**: Sin cambios
   - **Azure AD**: Deshabilitado
   - **Apagado automático**: Habilitado (opcional, para ahorrar costos en desarrollo)

9. **Revisar y crear**:
   - Revisar configuración
   - Clic en "Crear"
   - **Descargar clave privada** cuando aparezca el prompt

---

## 🔧 PARTE 2: Configurar Reglas de Firewall (NSG)

### 2.1 Agregar Puerto 3000 (Backend API)

1. En Azure Portal → Tu VM → "Redes"
2. Clic en "Agregar regla de puerto de entrada"
3. Configurar:
   ```
   - Origen: Any
   - Rangos de puerto de origen: *
   - Destino: Any
   - Intervalos de puertos de destino: 3000
   - Protocolo: TCP
   - Acción: Permitir
   - Prioridad: 320
   - Nombre: Port_3000_API
   ```

### 2.2 Agregar Puerto 5432 (PostgreSQL - Opcional)

Si necesitas acceso externo a PostgreSQL:
```
- Intervalos de puertos de destino: 5432
- Prioridad: 330
- Nombre: Port_5432_PostgreSQL
```

⚠️ **Recomendación**: Solo permitir desde IPs específicas para mayor seguridad.

---

## 💻 PARTE 3: Conectarse a la VM y Configurar Servidor

### 3.1 Conectar vía SSH

**En Windows (PowerShell):**
```powershell
# Cambiar permisos de la clave (solo primera vez)
icacls "C:\Users\TuUsuario\Downloads\crm-ngso-ssh-key.pem" /inheritance:r
icacls "C:\Users\TuUsuario\Downloads\crm-ngso-ssh-key.pem" /grant:r "%username%:R"

# Conectar a la VM
ssh -i "C:\Users\TuUsuario\Downloads\crm-ngso-ssh-key.pem" azureuser@<IP_PUBLICA_VM>
```

**En Linux/Mac:**
```bash
chmod 400 ~/Downloads/crm-ngso-ssh-key.pem
ssh -i ~/Downloads/crm-ngso-ssh-key.pem azureuser@<IP_PUBLICA_VM>
```

### 3.2 Actualizar Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.3 Instalar Node.js 20.x

```bash
# Instalar Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version  # Debe mostrar v20.x.x
npm --version   # Debe mostrar 10.x.x
```

### 3.4 Instalar PostgreSQL 15

```bash
# Agregar repositorio de PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# Instalar PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-contrib-15

# Verificar instalación
sudo systemctl status postgresql
```

### 3.5 Configurar PostgreSQL

```bash
# Cambiar a usuario postgres
sudo -u postgres psql

# Dentro de psql, ejecutar:
CREATE DATABASE crm_whatsapp;
CREATE USER crm_admin WITH ENCRYPTED PASSWORD 'TuPasswordSeguro123!';
GRANT ALL PRIVILEGES ON DATABASE crm_whatsapp TO crm_admin;
\q

# Habilitar acceso local
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

Agregar esta línea antes de las demás:
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   crm_whatsapp    crm_admin                               md5
host    crm_whatsapp    crm_admin       127.0.0.1/32            md5
```

Reiniciar PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 3.6 Instalar PM2 (Gestor de Procesos)

```bash
sudo npm install -g pm2
```

### 3.7 Instalar Nginx (Servidor Web)

```bash
sudo apt install -y nginx

# Habilitar firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable

# Verificar estado
sudo systemctl status nginx
```

### 3.8 Instalar Certbot (SSL Gratuito)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 📦 PARTE 4: Desplegar la Aplicación

### 4.1 Clonar Repositorio o Subir Archivos

**Opción A: Clonar desde GitHub** (Recomendado)
```bash
cd /home/azureuser
git clone https://github.com/sanalejo720/crm-bot-ngso.git crm-ngso-whatsapp
cd crm-ngso-whatsapp
git checkout feature/mejoras-crm-bot
```

**Opción B: Subir archivos vía SCP**
```powershell
# Desde tu máquina local
scp -i "crm-ngso-ssh-key.pem" -r d:\crm-ngso-whatsapp azureuser@<IP_PUBLICA>:/home/azureuser/
```

### 4.2 Configurar Backend

```bash
cd /home/azureuser/crm-ngso-whatsapp/backend

# Instalar dependencias
npm install

# Crear archivo .env de producción
nano .env.production
```

Contenido del `.env.production`:
```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=crm_admin
DB_PASSWORD=TuPasswordSeguro123!
DB_DATABASE=crm_whatsapp

# JWT
JWT_SECRET=tu_jwt_secret_super_seguro_cambiar_en_produccion_2024
JWT_EXPIRATION=24h

# API
PORT=3000
NODE_ENV=production

# Email (Hostinger SMTP)
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=admin@assoftware.xyz
EMAIL_PASSWORD=tu_password_email

# CORS
CORS_ORIGIN=http://<IP_PUBLICA_VM>

# WhatsApp
WHATSAPP_SESSION_PATH=/home/azureuser/crm-ngso-whatsapp/backend/wpp-sessions
WHATSAPP_TOKENS_PATH=/home/azureuser/crm-ngso-whatsapp/backend/tokens
```

```bash
# Construir aplicación
npm run build

# Ejecutar migraciones
NODE_ENV=production npm run migration:run

# Crear usuario admin inicial (si no existe)
node dist/scripts/create-admin.js
```

### 4.3 Configurar Frontend

```bash
cd /home/azureuser/crm-ngso-whatsapp/frontend

# Crear archivo .env de producción
nano .env.production
```

Contenido del `.env.production`:
```env
VITE_API_URL=http://<IP_PUBLICA_VM>:3000/api/v1
VITE_WS_URL=ws://<IP_PUBLICA_VM>:3000
```

```bash
# Instalar dependencias
npm install

# Construir para producción
npm run build
```

### 4.4 Iniciar Backend con PM2

```bash
cd /home/azureuser/crm-ngso-whatsapp/backend

# Iniciar aplicación
pm2 start dist/main.js --name crm-backend --env production

# Guardar configuración de PM2
pm2 save

# Configurar PM2 para iniciar al arrancar el sistema
pm2 startup systemd
# Ejecutar el comando que PM2 te muestra (sudo env PATH=...)
```

Verificar que está corriendo:
```bash
pm2 status
pm2 logs crm-backend
```

---

## 🌐 PARTE 5: Configurar Nginx como Proxy Reverso

### 5.1 Configurar Nginx para Frontend y Backend

```bash
sudo nano /etc/nginx/sites-available/crm-ngso
```

Contenido del archivo:
```nginx
# Frontend - React SPA
server {
    listen 80;
    server_name <IP_PUBLICA_VM>;  # Cambiar por tu dominio si tienes

    root /home/azureuser/crm-ngso-whatsapp/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend SPA - todas las rutas devuelven index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Archivos estáticos con caché
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API - Proxy Reverso
server {
    listen 80;
    server_name api.<IP_PUBLICA_VM>;  # O usa la misma IP con ruta /api

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support
        proxy_read_timeout 86400;
    }
}
```

**Alternativa (Backend en /api):**
Si prefieres tener todo en un mismo dominio:
```nginx
server {
    listen 80;
    server_name <IP_PUBLICA_VM>;

    # Frontend
    location / {
        root /home/azureuser/crm-ngso-whatsapp/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5.2 Activar Configuración de Nginx

```bash
# Crear symlink
sudo ln -s /etc/nginx/sites-available/crm-ngso /etc/nginx/sites-enabled/

# Eliminar sitio por defecto
sudo rm /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

---

## 🔒 PARTE 6: Configurar SSL con Let's Encrypt (HTTPS)

⚠️ **IMPORTANTE**: Necesitas un dominio apuntando a la IP de tu VM para SSL.

### 6.1 Configurar DNS

En tu proveedor de dominio (GoDaddy, Namecheap, etc.):
```
Tipo A: crm.tudominio.com → <IP_PUBLICA_VM>
Tipo A: api.tudominio.com → <IP_PUBLICA_VM>
```

### 6.2 Obtener Certificado SSL

```bash
# Para frontend
sudo certbot --nginx -d crm.tudominio.com

# Para backend (si usas subdominio)
sudo certbot --nginx -d api.tudominio.com
```

### 6.3 Renovación Automática

Certbot configura automáticamente la renovación. Verificar:
```bash
sudo certbot renew --dry-run
```

---

## 🔄 PARTE 7: Comandos Útiles de Gestión

### Backend (PM2)

```bash
# Ver logs en tiempo real
pm2 logs crm-backend

# Reiniciar aplicación
pm2 restart crm-backend

# Detener aplicación
pm2 stop crm-backend

# Ver estado
pm2 status

# Monitoreo de recursos
pm2 monit
```

### Base de Datos

```bash
# Backup de base de datos
sudo -u postgres pg_dump crm_whatsapp > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
sudo -u postgres psql crm_whatsapp < backup_20241126_120000.sql

# Conectar a base de datos
sudo -u postgres psql -d crm_whatsapp
```

### Nginx

```bash
# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs de error
sudo tail -f /var/log/nginx/error.log

# Ver logs de acceso
sudo tail -f /var/log/nginx/access.log
```

### Sistema

```bash
# Ver uso de recursos
htop
df -h        # Espacio en disco
free -h      # Memoria RAM
```

---

## 📝 PARTE 8: Script de Actualización Automática

Crear script para actualizar la aplicación:

```bash
nano ~/update-crm.sh
```

Contenido:
```bash
#!/bin/bash

echo "🔄 Actualizando CRM NGSO..."

# Backend
cd /home/azureuser/crm-ngso-whatsapp/backend
git pull origin feature/mejoras-crm-bot
npm install
npm run build
pm2 restart crm-backend

# Frontend
cd /home/azureuser/crm-ngso-whatsapp/frontend
npm install
npm run build

# Recargar Nginx
sudo systemctl reload nginx

echo "✅ Actualización completada!"
```

Dar permisos de ejecución:
```bash
chmod +x ~/update-crm.sh
```

Usar:
```bash
~/update-crm.sh
```

---

## 🔐 PARTE 9: Seguridad Adicional

### 9.1 Configurar Firewall UFW

```bash
sudo ufw status
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # API (solo si necesitas acceso directo)
sudo ufw enable
```

### 9.2 Configurar Fail2Ban (Protección SSH)

```bash
sudo apt install -y fail2ban

sudo nano /etc/fail2ban/jail.local
```

Contenido:
```ini
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

```bash
sudo systemctl restart fail2ban
```

### 9.3 Cambiar Puerto SSH (Opcional)

```bash
sudo nano /etc/ssh/sshd_config
```

Cambiar:
```
Port 22  →  Port 2222
```

Actualizar firewall:
```bash
sudo ufw allow 2222/tcp
sudo ufw delete allow 22/tcp
sudo systemctl restart sshd
```

---

## 📊 PARTE 10: Monitoreo y Logs

### 10.1 Instalar Netdata (Monitoreo en Tiempo Real)

```bash
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

Acceder: `http://<IP_PUBLICA_VM>:19999`

### 10.2 Configurar Logs Rotativos

```bash
sudo nano /etc/logrotate.d/pm2-crm
```

Contenido:
```
/home/azureuser/.pm2/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
```

---

## 🚨 PARTE 11: Troubleshooting

### Backend no inicia
```bash
pm2 logs crm-backend --lines 100
# Verificar conexión a BD
sudo -u postgres psql -d crm_whatsapp -c "SELECT 1;"
```

### Frontend muestra pantalla blanca
```bash
# Verificar que los archivos estén en dist/
ls -la /home/azureuser/crm-ngso-whatsapp/frontend/dist/

# Verificar permisos
sudo chown -R azureuser:azureuser /home/azureuser/crm-ngso-whatsapp/frontend/dist/
```

### Error 502 Bad Gateway
```bash
# Verificar que el backend esté corriendo
pm2 status

# Verificar configuración de Nginx
sudo nginx -t

# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

---

## 💰 Estimación de Costos Azure

**Standard_B2ms VM:**
- ~$60-80 USD/mes (región East US)
- ~$20 USD/mes con apagado nocturno (ahorro 60%)

**Alternativa económica Standard_B1ms:**
- 1 vCPU, 2 GB RAM
- ~$15-20 USD/mes
- Suficiente para aplicaciones pequeñas

---

## ✅ Checklist de Despliegue

- [ ] VM creada y configurada en Azure
- [ ] Reglas de firewall (NSG) configuradas (22, 80, 443, 3000)
- [ ] Node.js 20.x instalado
- [ ] PostgreSQL 15 instalado y configurado
- [ ] PM2 instalado globalmente
- [ ] Nginx instalado y configurado
- [ ] Repositorio clonado o archivos subidos
- [ ] Backend: .env.production configurado
- [ ] Backend: npm install y npm run build ejecutados
- [ ] Backend: Migraciones ejecutadas
- [ ] Backend: Usuario admin creado
- [ ] Backend: Iniciado con PM2
- [ ] Frontend: .env.production configurado
- [ ] Frontend: npm install y npm run build ejecutados
- [ ] Nginx: Configuración creada y activada
- [ ] SSL: Certificado Let's Encrypt configurado (si tienes dominio)
- [ ] Firewall UFW habilitado
- [ ] Fail2Ban instalado
- [ ] Script de actualización creado
- [ ] Backup de base de datos configurado

---

## 📞 Soporte

Si encuentras problemas durante el despliegue, revisa:
1. Logs de PM2: `pm2 logs crm-backend`
2. Logs de Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Logs de PostgreSQL: `sudo tail -f /var/log/postgresql/postgresql-15-main.log`

---

**¡Despliegue completado!** 🎉

Accede a tu aplicación en:
- Frontend: `http://<IP_PUBLICA_VM>` o `https://crm.tudominio.com`
- Backend API: `http://<IP_PUBLICA_VM>:3000` o `https://api.tudominio.com`
