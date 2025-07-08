# 🚀 ChambaPE - Guía de Deploy EC2 + S3 + RDS

## 📋 Resumen Ejecutivo

**Arquitectura**: EC2 + RDS PostgreSQL + S3 Storage  
**Costo Estimado**: $25-50 USD/mes  
**Tiempo de Setup**: 20-30 minutos

### 🎯 Servicios AWS que se crearán:

- ✅ **EC2 Instance** (t3.small) - Servidor de aplicación
- ✅ **RDS PostgreSQL** (db.t3.micro) - Base de datos
- ✅ **S3 Bucket** - Almacenamiento de archivos
- ✅ **Security Groups** - Configuración de red
- ✅ **Key Pair** - Acceso SSH

---

## 🛠️ Paso 1: Prerrequisitos

### Instalar herramientas necesarias:

```powershell
# 1. AWS CLI (si no está instalado)
# Descargar desde: https://aws.amazon.com/cli/

# 2. Verificar instalación
aws --version
docker --version

# 3. Configurar credenciales AWS
aws configure
```

**Configuración AWS requerida:**

- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default output format: `json`

---

## 🚀 Paso 2: Deploy Automático (RECOMENDADO)

### Opción A: Deploy completo en un comando

```powershell
# Crear toda la infraestructura
.\deploy-ec2-stack.ps1 -Action create

# Esperar a que RDS esté listo (10-15 minutos)
.\deploy-ec2-stack.ps1 -Action status

# Desplegar aplicación
.\deploy-ec2-stack.ps1 -Action deploy
```

### Opción B: Deploy paso a paso

```powershell
# 1. Verificar requisitos
.\deploy-ec2-stack.ps1 -Action setup

# 2. Crear infraestructura por partes
.\deploy-ec2-stack.ps1 -Action create

# 3. Verificar estado
.\deploy-ec2-stack.ps1 -Action status

# 4. Desplegar aplicación
.\deploy-ec2-stack.ps1 -Action deploy
```

---

## ⚙️ Paso 3: Configuración Manual (Si prefieres control total)

### 3.1 Crear Key Pair

```powershell
aws ec2 create-key-pair --key-name chambape-key --region us-east-1 --query 'KeyMaterial' --output text > chambape-key.pem
```

### 3.2 Crear Security Group

```powershell
# Crear security group
$SG_ID = aws ec2 create-security-group --group-name chambape-sg --description "ChambaPE Security Group" --region us-east-1 --query 'GroupId' --output text

# Reglas de entrada
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0 --region us-east-1
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 --region us-east-1
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0 --region us-east-1
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region us-east-1
```

### 3.3 Crear S3 Bucket

```powershell
aws s3api create-bucket --bucket chambape-storage-prod --region us-east-1
aws s3api put-public-access-block --bucket chambape-storage-prod --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 3.4 Crear RDS Instance

```powershell
aws rds create-db-instance \
    --db-instance-identifier chambape-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.4 \
    --master-username chambape_user \
    --master-user-password "ChambaPE2024!Secure" \
    --allocated-storage 20 \
    --db-name chambape_production \
    --storage-type gp2 \
    --publicly-accessible \
    --region us-east-1
```

### 3.5 Crear EC2 Instance

```powershell
# Obtener AMI más reciente
$AMI_ID = aws ec2 describe-images --owners amazon --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" "Name=state,Values=available" --region us-east-1 --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' --output text

# Crear instancia
aws ec2 run-instances \
    --image-id $AMI_ID \
    --count 1 \
    --instance-type t3.small \
    --key-name chambape-key \
    --security-group-ids $SG_ID \
    --region us-east-1 \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=chambape-server}]"
```

---

## 📝 Paso 4: Configurar Variables de Entorno

### Actualizar .env.production

```bash
# Obtener endpoints de RDS
RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier chambape-db --region us-east-1 --query 'DBInstances[0].Endpoint.Address' --output text)

# Obtener IP de EC2
EC2_IP=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=chambape-server" "Name=instance-state-name,Values=running" --region us-east-1 --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
```

**Editar .env.production:**

```env
DATABASE_HOST=tu-rds-endpoint.region.rds.amazonaws.com
BACKEND_DOMAIN=http://tu-ec2-ip:3000
AWS_S3_REGION=us-east-1
AWS_DEFAULT_S3_BUCKET=chambape-storage-prod
```

---

## 🚀 Paso 5: Deploy de la Aplicación

### 5.1 Preparar servidor EC2

```powershell
# Conectar por SSH
ssh -i chambape-key.pem ec2-user@TU_EC2_IP

# En el servidor, ejecutar setup
curl -s https://raw.githubusercontent.com/tu-repo/setup-ec2-server.sh | bash
```

### 5.2 Copiar código al servidor

```powershell
# Crear paquete
tar -czf chambape-app.tar.gz --exclude=node_modules --exclude=.git .

# Copiar archivos
scp -i chambape-key.pem chambape-app.tar.gz ec2-user@TU_EC2_IP:/home/ec2-user/
scp -i chambape-key.pem .env.production ec2-user@TU_EC2_IP:/home/ec2-user/.env
```

### 5.3 Deploy en servidor

```bash
# SSH al servidor
ssh -i chambape-key.pem ec2-user@TU_EC2_IP

# Extraer y configurar
cd /home/ec2-user
mkdir chambape && cd chambape
tar -xzf ../chambape-app.tar.gz
cp ../.env .env.production

# Instalar y iniciar
npm install --production
npm run build
pm2 start dist/main.js --name chambape-api
pm2 save && pm2 startup
```

---

## ✅ Paso 6: Verificación

### Verificar servicios

```bash
# Estado de la aplicación
pm2 status

# Logs de la aplicación
pm2 logs chambape-api

# Estado de nginx
sudo systemctl status nginx

# Test de API
curl http://localhost:3000/api/health
```

### URLs de acceso

- **API**: `http://TU_EC2_IP:3000/api`
- **Health Check**: `http://TU_EC2_IP:3000/health`
- **Documentación**: `http://TU_EC2_IP:3000/docs`

---

## 🔧 Comandos Útiles

### Monitoreo

```bash
# Ver logs en tiempo real
./logs.sh

# Monitor del sistema
./monitor.sh

# Estado de servicios
.\deploy-ec2-stack.ps1 -Action status
```

### Administración

```bash
# Reiniciar aplicación
pm2 restart chambape-api

# Actualizar aplicación
./deploy-app.sh

# Ver logs de nginx
sudo tail -f /var/log/nginx/chambape.access.log
```

---

## 🔒 Configuración SSL (HTTPS)

### Con Certbot (Gratis)

```bash
# En el servidor EC2
sudo certbot --nginx -d tu-dominio.com

# Verificar renovación automática
sudo certbot renew --dry-run
```

### Actualizar .env.production

```env
BACKEND_DOMAIN=https://tu-dominio.com
FRONTEND_DOMAIN=https://tu-frontend-domain.com
```

---

## 💰 Costos Estimados

| Servicio        | Tipo | Costo/mes  |
| --------------- | ---- | ---------- |
| EC2 t3.small    | 24/7 | ~$15-20    |
| RDS db.t3.micro | 24/7 | ~$15-20    |
| S3 Storage      | 10GB | ~$2-5      |
| Transferencia   | 50GB | ~$5-10     |
| **TOTAL**       |      | **$37-55** |

---

## 🆘 Solución de Problemas

### Aplicación no inicia

```bash
# Ver logs detallados
pm2 logs chambape-api --lines 100

# Verificar variables de entorno
cat .env.production

# Test manual
node dist/main.js
```

### Base de datos no conecta

```bash
# Test de conexión
telnet TU_RDS_ENDPOINT 5432

# Verificar security groups
aws ec2 describe-security-groups --group-ids TU_SG_ID
```

### Eliminar todo (Cleanup)

```powershell
# Eliminar todos los recursos
.\deploy-ec2-stack.ps1 -Action cleanup
```

---

## 📞 Soporte

Si tienes problemas:

1. **Ver logs**: `./logs.sh`
2. **Monitor**: `./monitor.sh`
3. **Estado AWS**: `.\deploy-ec2-stack.ps1 -Action status`
4. **Verificar conexiones**: `telnet tu-endpoint puerto`

¡Tu backend ChambaPE estará corriendo en la nube! 🚀
