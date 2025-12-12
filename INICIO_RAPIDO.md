# 🎯 INICIO RÁPIDO - DESPLIEGUE Y TESTING

**Todo lo que necesitas para desplegar en 30 minutos**

---

## ⚡ OPCIÓN 1: SCRIPT MAESTRO (Más Fácil)

### Un Solo Comando para Todo

```powershell
# Abrir PowerShell como Administrador
cd d:\crm-ngso-whatsapp

# Ejecutar script maestro (te pedirá la IP)
.\deploy-master.ps1
```

**El script hará TODO automáticamente:**
1. ✅ Validar requisitos
2. ✅ Desplegar aplicación
3. ✅ Verificar servicios
4. ✅ Probar endpoints
5. ✅ Abrir navegador para verificación visual
6. ✅ Mostrar resumen

**Tiempo: 15-20 minutos**

---

## ⚡ OPCIÓN 2: PASO A PASO

### 1. Obtener IP del VPS

```
https://hpanel.hostinger.com → VPS → Copiar IP
```

### 2. Agregar Clave SSH

```
Panel Hostinger → VPS → SSH → Agregar clave:
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIeBbKS0mar6gPtOTXa2/v5j5sWn2tZvAF2XBbN3V0uA
```

### 3. Desplegar

```powershell
cd d:\crm-ngso-whatsapp
.\deploy-from-windows.ps1
```

### 4. Configurar Servidor (Primera Vez)

```bash
ssh -i "C:\Users\alejo\.ssh\key_vps" root@TU_IP
bash /root/crm-ngso-whatsapp/deploy-hostinger.sh
bash /root/crm-ngso-whatsapp/setup-ssl-hostinger.sh
```

### 5. Verificar

```bash
bash /root/crm-ngso-whatsapp/verify-deployment.sh
```

### 6. Probar Endpoints

```powershell
# Desde Windows
cd d:\crm-ngso-whatsapp
node test-production-endpoints.js
```

---

## 📋 ANTES DE EMPEZAR

### Necesitas:
- [ ] Cuenta Hostinger VPS activa
- [ ] IP del VPS
- [ ] Clave SSH agregada al panel
- [ ] PowerShell con permisos de administrador

### Verifica:
```powershell
# Node.js instalado
node --version

# NPM instalado
npm --version

# Clave SSH existe
Test-Path "C:\Users\alejo\.ssh\key_vps"
```

---

## 🎯 DESPUÉS DEL DESPLIEGUE

### URLs para Verificar:

1. **Frontend:**
   ```
   https://ngso-chat.assoftware.xyz
   ```

2. **Backend API:**
   ```
   https://ngso-chat.assoftware.xyz/api/v1/health
   ```

3. **Swagger:**
   ```
   https://ngso-chat.assoftware.xyz/api/docs
   ```

### Comandos Útiles:

```bash
# Conectar al servidor
ssh -i "C:\Users\alejo\.ssh\key_vps" root@TU_IP

# Ver logs
pm2 logs crm-backend

# Estado
pm2 status

# Reiniciar
pm2 restart crm-backend
```

---

## 🆘 PROBLEMAS COMUNES

### Backend no responde
```bash
pm2 restart crm-backend
pm2 logs crm-backend
```

### Error 502
```bash
pm2 status
sudo nginx -t
sudo systemctl reload nginx
```

### Base de datos
```bash
sudo systemctl restart postgresql
```

---

## 📚 DOCUMENTACIÓN COMPLETA

- **GUIA_DESPLIEGUE_Y_TESTING.md** - Guía completa paso a paso
- **CHECKLIST_DESPLIEGUE_HOSTINGER.md** - Checklist detallado
- **RESUMEN_DESPLIEGUE_HOSTINGER.md** - Resumen ejecutivo

---

## ✅ CHECKLIST RÁPIDO

- [ ] IP obtenida
- [ ] SSH configurado
- [ ] `deploy-master.ps1` ejecutado
- [ ] Frontend carga (HTTPS)
- [ ] Backend responde (/health)
- [ ] Tests pasaron (>80%)
- [ ] Sin errores en logs

---

## 🎉 ¡LISTO!

Si todos los checkboxes están ✅:

**¡Tu sistema está desplegado y funcionando!** 🚀

---

**Tiempo total: 20-30 minutos**  
**Última actualización:** 1 de Diciembre, 2025
