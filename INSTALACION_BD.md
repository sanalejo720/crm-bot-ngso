# 🐘 Guía de Instalación de PostgreSQL y Redis

## Opción 1: Docker (Recomendado - Más Rápido)

### Requisitos
- Docker Desktop para Windows
- Descargar: https://www.docker.com/products/docker-desktop/

### Instalación

1. **Instalar Docker Desktop**
   - Descargar e instalar Docker Desktop
   - Reiniciar el sistema si es necesario
   - Abrir Docker Desktop y esperar a que inicie

2. **Iniciar PostgreSQL y Redis con Docker Compose**
   ```powershell
   cd d:\crm-ngso-whatsapp
   docker-compose up -d
   ```

3. **Verificar que estén corriendo**
   ```powershell
   docker ps
   ```

   Deberías ver 3 contenedores:
   - `crm-postgres` (Puerto 5432)
   - `crm-redis` (Puerto 6379)
   - `crm-pgadmin` (Puerto 5050) - Opcional

4. **Acceder a pgAdmin** (Opcional)
   - Abrir navegador: http://localhost:5050
   - Email: admin@crm.com
   - Password: admin123

### Comandos Útiles

```powershell
# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Reiniciar servicios
docker-compose restart

# Ver estado
docker-compose ps

# Eliminar todo (incluyendo datos)
docker-compose down -v
```

---

## Opción 2: Instalación Local con Chocolatey

### Requisitos
- PowerShell como **Administrador**

### Pasos

1. **Abrir PowerShell como Administrador**
   - Clic derecho en PowerShell → "Ejecutar como administrador"

2. **Instalar PostgreSQL**
   ```powershell
   choco install postgresql15 --params '/Password:postgres123' -y
   ```

3. **Instalar Redis**
   ```powershell
   choco install redis-64 -y
   ```

4. **Verificar Instalación**
   ```powershell
   psql --version
   redis-server --version
   ```

5. **Iniciar Servicios**
   ```powershell
   # PostgreSQL se inicia automáticamente como servicio
   
   # Redis (si no está como servicio)
   redis-server
   ```

6. **Crear Base de Datos**
   ```powershell
   # Conectar a PostgreSQL
   psql -U postgres

   # En el prompt de psql:
   CREATE DATABASE crm_whatsapp;
   \q
   ```

---

## Opción 3: Instalación Manual

### PostgreSQL

1. **Descargar PostgreSQL 15**
   - https://www.postgresql.org/download/windows/
   - Ejecutar el instalador
   - Password para postgres: `postgres123`
   - Puerto: `5432`

2. **Crear Base de Datos**
   - Abrir "pgAdmin 4" desde el menú inicio
   - Conectar al servidor local
   - Clic derecho en "Databases" → "Create" → "Database"
   - Name: `crm_whatsapp`

### Redis

1. **Descargar Redis para Windows**
   - https://github.com/microsoftarchive/redis/releases
   - Descargar: `Redis-x64-3.0.504.msi`
   - Instalar con configuración por defecto

2. **Verificar Redis**
   ```powershell
   redis-cli ping
   # Debería responder: PONG
   ```

---

## ⚙️ Configurar el Backend

Una vez que PostgreSQL y Redis estén corriendo, actualizar el archivo `.env`:

```env
# Database PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres123
DB_NAME=crm_whatsapp
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

## 🚀 Iniciar el Backend

```powershell
cd d:\crm-ngso-whatsapp\backend
npm run start:dev
```

Si todo está bien configurado, deberías ver:

```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] TypeOrmModule dependencies initialized
[Nest] LOG [Bootstrap] 🚀 Application is running on: http://localhost:3000/api/v1
[Nest] LOG [Bootstrap] 📚 API Documentation: http://localhost:3000/api/docs
```

---

## 🔍 Solución de Problemas

### Error: "Unable to connect to the database"
- Verificar que PostgreSQL esté corriendo
- Verificar credenciales en `.env`
- Verificar puerto 5432 no esté ocupado

### Error: "Redis connection refused"
- Verificar que Redis esté corriendo
- Verificar puerto 6379 no esté ocupado

### PostgreSQL - Resetear Password
```powershell
# Si olvidaste la password
# Editar: C:\Program Files\PostgreSQL\15\data\pg_hba.conf
# Cambiar "md5" a "trust" temporalmente
# Reiniciar servicio
# Cambiar password con: ALTER USER postgres PASSWORD 'postgres123';
```

---

## 📊 Verificar Conexiones

### PostgreSQL
```powershell
psql -U postgres -d crm_whatsapp -c "SELECT version();"
```

### Redis
```powershell
redis-cli ping
```

---

## ✅ Siguiente Paso

Una vez que PostgreSQL y Redis estén corriendo y el backend inicie correctamente, podremos:

1. ✅ Probar endpoints de la API
2. ✅ Crear usuarios y roles iniciales
3. ✅ Probar integración de WhatsApp
4. ✅ Verificar WebSocket en tiempo real
5. ✅ Continuar con el desarrollo del frontend

**¿Necesitas ayuda con algún método de instalación específico?**
