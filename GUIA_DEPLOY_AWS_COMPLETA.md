# 🚀 Guía Completa de Despliegue en AWS - ChambaPE API

Esta guía te llevará paso a paso para desplegar tu backend NestJS en AWS usando EC2, S3 y RDS.

## 📋 Prerrequisitos

### 1. Cuenta de AWS
- Cuenta de AWS activa
- Acceso a la consola de AWS
- Permisos para crear recursos (EC2, RDS, S3, IAM)

### 2. Herramientas locales
- **AWS CLI** instalado y configurado
- **Docker** instalado
- **Git** para clonar el repositorio
- **SSH** para conectarse al servidor

### 3. Configurar AWS CLI
```bash
aws configure
# Ingresa tu Access Key ID
# Ingresa tu Secret Access Key
# Ingresa la región (ej: us-east-1)
# Ingresa el formato de salida (json)
```

## 🏗️ Paso 1: Crear la Infraestructura AWS

### 1.1 Crear Base de Datos RDS

```bash
# Navegar al directorio del proyecto
cd nestjs-boilerplate

# Dar permisos de ejecución al script
chmod +x scripts/setup-rds.sh

# Ejecutar el script para crear RDS
./scripts/setup-rds.sh
```

**Nota importante:** Guarda la información que te muestra al final:
- Endpoint de la base de datos
- Usuario y contraseña
- URL de conexión

### 1.2 Crear Bucket S3

```bash
# Dar permisos de ejecución al script
chmod +x scripts/setup-s3.sh

# Ejecutar el script para crear S3
./scripts/setup-s3.sh
```

**Nota importante:** Guarda el nombre del bucket que se genera.

### 1.3 Crear Instancia EC2

```bash
# Dar permisos de ejecución al script
chmod +x scripts/setup-ec2.sh

# Ejecutar el script para crear EC2
./scripts/setup-ec2.sh
```

**Nota importante:** Guarda:
- IP pública de la instancia
- Ubicación de la clave privada (.pem)

## 🔧 Paso 2: Configurar Credenciales AWS

### 2.1 Crear Usuario IAM para la aplicación

1. Ve a la consola de AWS → IAM
2. Crea un nuevo usuario con permisos programáticos
3. Asigna las siguientes políticas:
   - `AmazonS3FullAccess`
   - `AmazonRDSFullAccess`
   - `CloudWatchLogsFullAccess`

### 2.2 Obtener credenciales
- Access Key ID
- Secret Access Key

## ⚙️ Paso 3: Configurar Variables de Entorno

### 3.1 Crear archivo de configuración de producción

```bash
# Copiar el archivo de ejemplo
cp env-production-aws .env.production

# Editar el archivo con tus valores reales
nano .env.production
```

### 3.2 Actualizar las siguientes variables:

```bash
# Base de datos RDS (reemplazar con valores reales)
DATABASE_HOST=tu-rds-endpoint.region.rds.amazonaws.com
DATABASE_USERNAME=chambape_user
DATABASE_PASSWORD=ChambaPE2024!Secure
DATABASE_NAME=chambape_db
DATABASE_URL=postgresql://chambape_user:ChambaPE2024!Secure@tu-rds-endpoint.region.rds.amazonaws.com:5432/chambape_db

# S3 (reemplazar con valores reales)
ACCESS_KEY_ID=tu_access_key_id
SECRET_ACCESS_KEY=tu_secret_access_key
AWS_S3_REGION=us-east-1
AWS_DEFAULT_S3_BUCKET=tu-bucket-name

# JWT Secrets (generar nuevos)
AUTH_JWT_SECRET=tu_jwt_secret_muy_seguro
AUTH_REFRESH_SECRET=tu_refresh_secret_muy_seguro
AUTH_FORGOT_SECRET=tu_forgot_secret_muy_seguro
AUTH_CONFIRM_EMAIL_SECRET=tu_confirm_email_secret_muy_seguro
```

## 🚀 Paso 4: Desplegar la Aplicación

### 4.1 Ejecutar el script de despliegue

```bash
# Dar permisos de ejecución
chmod +x scripts/deploy-to-aws.sh

# Ejecutar el despliegue
./scripts/deploy-to-aws.sh
```

El script te pedirá la IP de tu instancia EC2.

### 4.2 Verificar el despliegue

```bash
# Verificar que la API responda
curl http://TU_IP_EC2/health

# Verificar documentación
curl http://TU_IP_EC2/api/docs
```

## 🔍 Paso 5: Verificar y Monitorear

### 5.1 Verificar logs

```bash
# Conectarse al servidor
ssh -i chambape-key.pem ubuntu@TU_IP_EC2

# Ver logs de la aplicación
docker logs -f chambape-api

# Ver logs de Nginx
sudo journalctl -u nginx -f
```

### 5.2 Verificar servicios

```bash
# Ver contenedores ejecutándose
docker ps

# Ver estado de Nginx
sudo systemctl status nginx

# Ver uso de recursos
htop
```

## 🔧 Paso 6: Configuración Adicional

### 6.1 Configurar dominio (opcional)

Si tienes un dominio:

1. **Configurar DNS:**
   - Crear registro A apuntando a la IP de EC2
   - Crear registro CNAME para www

2. **Configurar SSL con Let's Encrypt:**
   ```bash
   # Conectarse al servidor
   ssh -i chambape-key.pem ubuntu@TU_IP_EC2
   
   # Instalar Certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Obtener certificado
   sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
   ```

### 6.2 Configurar backups automáticos

```bash
# Crear script de backup
cat > backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="chambape_db_$DATE.sql"
BUCKET_NAME="tu-bucket-name"

# Crear backup de la base de datos
pg_dump -h tu-rds-endpoint -U chambape_user -d chambape_db > $BACKUP_FILE

# Subir a S3
aws s3 cp $BACKUP_FILE s3://$BUCKET_NAME/backups/

# Limpiar archivo local
rm $BACKUP_FILE
EOF

# Agregar a crontab (backup diario a las 2 AM)
echo "0 2 * * * /opt/chambape-api/backup-db.sh" | crontab -
```

## 🛠️ Comandos Útiles

### Gestión de la aplicación

```bash
# Reiniciar aplicación
ssh -i chambape-key.pem ubuntu@TU_IP_EC2 'docker restart chambape-api'

# Ver logs en tiempo real
ssh -i chambape-key.pem ubuntu@TU_IP_EC2 'docker logs -f chambape-api'

# Actualizar aplicación
./scripts/deploy-to-aws.sh

# Verificar estado de servicios
ssh -i chambape-key.pem ubuntu@TU_IP_EC2 'docker ps && sudo systemctl status nginx'
```

### Gestión de la base de datos

```bash
# Conectar a la base de datos
psql -h tu-rds-endpoint -U chambape_user -d chambape_db

# Ejecutar migraciones
ssh -i chambape-key.pem ubuntu@TU_IP_EC2 'docker exec chambape-api npm run migration:run'

# Crear backup manual
pg_dump -h tu-rds-endpoint -U chambape_user -d chambape_db > backup.sql
```

### Monitoreo

```bash
# Ver uso de CPU y memoria
ssh -i chambape-key.pem ubuntu@TU_IP_EC2 'htop'

# Ver espacio en disco
ssh -i chambape-key.pem ubuntu@TU_IP_EC2 'df -h'

# Ver logs del sistema
ssh -i chambape-key.pem ubuntu@TU_IP_EC2 'sudo journalctl -f'
```

## 🔒 Seguridad

### Configuraciones recomendadas

1. **Firewall:**
   - Solo puertos 22 (SSH), 80 (HTTP), 443 (HTTPS)
   - Bloquear acceso directo al puerto 3000

2. **SSH:**
   - Usar claves SSH en lugar de contraseñas
   - Cambiar puerto SSH por defecto
   - Usar fail2ban

3. **Base de datos:**
   - Solo permitir conexiones desde EC2
   - Usar SSL para conexiones
   - Cambiar contraseñas regularmente

4. **S3:**
   - Configurar políticas de bucket restrictivas
   - Habilitar versionado
   - Configurar lifecycle policies

## 📊 Monitoreo y Alertas

### Configurar CloudWatch

1. **Métricas básicas:**
   - CPU, memoria, disco
   - Latencia de la aplicación
   - Errores HTTP

2. **Logs:**
   - Logs de la aplicación
   - Logs de Nginx
   - Logs de Docker

3. **Alertas:**
   - CPU > 80%
   - Memoria > 80%
   - Errores 5xx > 5%

## 🚨 Solución de Problemas

### Problemas comunes

1. **La aplicación no responde:**
   ```bash
   # Verificar contenedor
   docker ps
   docker logs chambape-api
   
   # Verificar puertos
   netstat -tlnp | grep 3000
   ```

2. **Error de conexión a la base de datos:**
   ```bash
   # Verificar conectividad
   telnet tu-rds-endpoint 5432
   
   # Verificar credenciales
   psql -h tu-rds-endpoint -U chambape_user -d chambape_db
   ```

3. **Error de S3:**
   ```bash
   # Verificar credenciales AWS
   aws sts get-caller-identity
   
   # Verificar bucket
   aws s3 ls s3://tu-bucket-name
   ```

## 📈 Escalabilidad

### Para producción con alto tráfico

1. **EC2:**
   - Cambiar a instancias más grandes (t3.small, t3.medium)
   - Usar Auto Scaling Groups
   - Implementar Load Balancer

2. **Base de datos:**
   - Cambiar a instancias más grandes
   - Implementar read replicas
   - Usar RDS Proxy

3. **Almacenamiento:**
   - Usar CloudFront para CDN
   - Implementar cache con Redis
   - Optimizar imágenes

## 🎉 ¡Listo!

Tu aplicación ChambaPE API está ahora desplegada en AWS con:
- ✅ Base de datos PostgreSQL en RDS
- ✅ Almacenamiento de archivos en S3
- ✅ Servidor web en EC2
- ✅ Proxy reverso con Nginx
- ✅ Contenedores Docker
- ✅ Logs y monitoreo

**URL de tu API:** `http://TU_IP_EC2`
**Health Check:** `http://TU_IP_EC2/health`
**Documentación:** `http://TU_IP_EC2/api/docs`

¡Tu backend está listo para recibir peticiones desde tu aplicación Flutter! 