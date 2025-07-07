# 🚀 Pasos Detallados para el Primer Despliegue de ChambaPE en AWS

## 📋 Prerequisitos

### 1. Cuenta AWS
- ✅ Cuenta AWS configurada en región **us-east-2**
- ✅ Acceso como usuario root o IAM con permisos administrativos
- ✅ AWS CLI instalado y configurado

### 2. Herramientas Locales
- Docker Desktop instalado
- Node.js 18+ instalado
- Git configurado
- PowerShell (Windows)

## 🔧 Configuración Inicial

### Paso 1: Configurar AWS CLI
```powershell
# Verificar instalación
aws --version

# Configurar credenciales (usar credenciales de root temporalmente)
aws configure
# AWS Access Key ID: [Tu Access Key]
# AWS Secret Access Key: [Tu Secret Key]
# Default region name: us-east-2
# Default output format: json

# Verificar configuración
aws sts get-caller-identity
```

### Paso 2: Crear Roles IAM Necesarios

```powershell
# Crear rol de ejecución de ECS
aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

# Adjuntar política de ejecución
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Crear rol de tarea de ECS
aws iam create-role --role-name ecsTaskRole --assume-role-policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

# Adjuntar políticas necesarias para la aplicación
aws iam attach-role-policy --role-name ecsTaskRole --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-role-policy --role-name ecsTaskRole --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
aws iam attach-role-policy --role-name ecsTaskRole --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess
```

### Paso 3: Crear VPC y Recursos de Red

```powershell
# Crear VPC
$VPC_ID = aws ec2 create-vpc --cidr-block 10.0.0.0/16 --query 'Vpc.VpcId' --output text
aws ec2 create-tags --resources $VPC_ID --tags Key=Name,Value=ChambaPE-VPC

# Habilitar DNS en VPC
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support

# Crear Internet Gateway
$IGW_ID = aws ec2 create-internet-gateway --query 'InternetGateway.InternetGatewayId' --output text
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID
aws ec2 create-tags --resources $IGW_ID --tags Key=Name,Value=ChambaPE-IGW

# Crear subredes públicas
$SUBNET_1A = aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone us-east-2a --query 'Subnet.SubnetId' --output text
$SUBNET_1B = aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone us-east-2b --query 'Subnet.SubnetId' --output text

aws ec2 create-tags --resources $SUBNET_1A --tags Key=Name,Value=ChambaPE-Public-1A
aws ec2 create-tags --resources $SUBNET_1B --tags Key=Name,Value=ChambaPE-Public-1B

# Hacer subredes públicas
aws ec2 modify-subnet-attribute --subnet-id $SUBNET_1A --map-public-ip-on-launch
aws ec2 modify-subnet-attribute --subnet-id $SUBNET_1B --map-public-ip-on-launch

# Crear subredes privadas para RDS
$SUBNET_DB_1A = aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.3.0/24 --availability-zone us-east-2a --query 'Subnet.SubnetId' --output text
$SUBNET_DB_1B = aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.4.0/24 --availability-zone us-east-2b --query 'Subnet.SubnetId' --output text

aws ec2 create-tags --resources $SUBNET_DB_1A --tags Key=Name,Value=ChambaPE-DB-1A
aws ec2 create-tags --resources $SUBNET_DB_1B --tags Key=Name,Value=ChambaPE-DB-1B

# Crear tabla de rutas
$ROUTE_TABLE = aws ec2 create-route-table --vpc-id $VPC_ID --query 'RouteTable.RouteTableId' --output text
aws ec2 create-route --route-table-id $ROUTE_TABLE --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID

# Asociar subredes públicas a la tabla de rutas
aws ec2 associate-route-table --subnet-id $SUBNET_1A --route-table-id $ROUTE_TABLE
aws ec2 associate-route-table --subnet-id $SUBNET_1B --route-table-id $ROUTE_TABLE
```

### Paso 4: Crear Grupos de Seguridad

```powershell
# Grupo de seguridad para ALB
$ALB_SG = aws ec2 create-security-group --group-name ChambaPE-ALB-SG --description "Security group for ChambaPE ALB" --vpc-id $VPC_ID --query 'GroupId' --output text

aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 443 --cidr 0.0.0.0/0

# Grupo de seguridad para ECS
$ECS_SG = aws ec2 create-security-group --group-name ChambaPE-ECS-SG --description "Security group for ChambaPE ECS" --vpc-id $VPC_ID --query 'GroupId' --output text

aws ec2 authorize-security-group-ingress --group-id $ECS_SG --protocol tcp --port 3000 --source-group $ALB_SG

# Grupo de seguridad para RDS
$RDS_SG = aws ec2 create-security-group --group-name ChambaPE-RDS-SG --description "Security group for ChambaPE RDS" --vpc-id $VPC_ID --query 'GroupId' --output text

aws ec2 authorize-security-group-ingress --group-id $RDS_SG --protocol tcp --port 5432 --source-group $ECS_SG
```

### Paso 5: Crear Repositorio ECR

```powershell
# Crear repositorio ECR
aws ecr create-repository --repository-name chambape-api --region us-east-2

# Obtener URI del repositorio
$ECR_URI = aws ecr describe-repositories --repository-names chambape-api --query 'repositories[0].repositoryUri' --output text
Write-Host "ECR Repository URI: $ECR_URI"
```

### Paso 6: Crear Base de Datos RDS

```powershell
# Crear grupo de subredes para RDS
aws rds create-db-subnet-group --db-subnet-group-name chambape-db-subnet-group --db-subnet-group-description "Subnet group for ChambaPE database" --subnet-ids $SUBNET_DB_1A $SUBNET_DB_1B

# Crear instancia RDS PostgreSQL
aws rds create-db-instance `
  --db-instance-identifier chambape-db `
  --db-instance-class db.t3.micro `
  --engine postgres `
  --engine-version 15.4 `
  --master-username chambapeuser `
  --master-user-password "ChangeMe123!" `
  --allocated-storage 20 `
  --vpc-security-group-ids $RDS_SG `
  --db-subnet-group-name chambape-db-subnet-group `
  --backup-retention-period 7 `
  --multi-az `
  --storage-encrypted `
  --db-name chambapedb

# Esperar a que la base de datos esté disponible (esto puede tomar 10-15 minutos)
Write-Host "Esperando a que la base de datos esté disponible..."
aws rds wait db-instance-available --db-instance-identifier chambape-db

# Obtener endpoint de la base de datos
$DB_ENDPOINT = aws rds describe-db-instances --db-instance-identifier chambape-db --query 'DBInstances[0].Endpoint.Address' --output text
Write-Host "Database Endpoint: $DB_ENDPOINT"
```

### Paso 7: Crear Bucket S3

```powershell
# Crear bucket S3 para uploads
aws s3 mb s3://chambape-uploads-$(Get-Random -Minimum 1000 -Maximum 9999) --region us-east-2

# Configurar CORS para el bucket (crear archivo cors.json primero)
@'
{
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
            "AllowedHeaders": ["*"],
            "MaxAgeSeconds": 3000
        }
    ]
}
'@ | Out-File -FilePath cors.json -Encoding utf8

aws s3api put-bucket-cors --bucket chambape-uploads-1234 --cors-configuration file://cors.json
```

## 🚀 Despliegue de la Aplicación

### Paso 8: Configurar Variables de Entorno

```powershell
# Copiar archivo de ejemplo
Copy-Item "env-example-aws" ".env.production"

# Editar .env.production con los valores reales:
# - DATABASE_HOST: usar el endpoint de RDS obtenido
# - AWS_DEFAULT_S3_BUCKET: usar el nombre del bucket creado
# - Generar nuevos secretos JWT
# - Configurar otros valores según sea necesario
```

### Paso 9: Configurar AWS Secrets Manager

```powershell
# Ejecutar script de configuración de secretos
chmod +x setup-aws-secrets.sh
./setup-aws-secrets.sh production
```

### Paso 10: Construir y Subir Imagen Docker

```powershell
# Autenticarse con ECR
$ECR_TOKEN = aws ecr get-login-password --region us-east-2
$ECR_TOKEN | docker login --username AWS --password-stdin $ECR_URI

# Construir imagen
docker build -f Dockerfile.aws -t chambape-api .

# Etiquetar imagen
docker tag chambape-api:latest $ECR_URI:latest

# Subir imagen
docker push $ECR_URI:latest
```

### Paso 11: Crear Cluster ECS

```powershell
# Crear cluster ECS
aws ecs create-cluster --cluster-name chambape-cluster

# Actualizar task definition con Account ID real
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text

# Actualizar task-definition.json reemplazando ACCOUNT_ID con el valor real
(Get-Content task-definition.json) -replace 'ACCOUNT_ID', $ACCOUNT_ID | Set-Content task-definition-updated.json

# Registrar task definition
aws ecs register-task-definition --cli-input-json file://task-definition-updated.json
```

### Paso 12: Crear Application Load Balancer

```powershell
# Crear ALB
$ALB_ARN = aws elbv2 create-load-balancer `
  --name chambape-alb `
  --subnets $SUBNET_1A $SUBNET_1B `
  --security-groups $ALB_SG `
  --query 'LoadBalancers[0].LoadBalancerArn' --output text

# Crear target group
$TG_ARN = aws elbv2 create-target-group `
  --name chambape-targets `
  --protocol HTTP `
  --port 3000 `
  --vpc-id $VPC_ID `
  --target-type ip `
  --health-check-path /api/health `
  --query 'TargetGroups[0].TargetGroupArn' --output text

# Crear listener
aws elbv2 create-listener `
  --load-balancer-arn $ALB_ARN `
  --protocol HTTP `
  --port 80 `
  --default-actions Type=forward,TargetGroupArn=$TG_ARN
```

### Paso 13: Crear Servicio ECS

```powershell
# Crear servicio ECS
aws ecs create-service `
  --cluster chambape-cluster `
  --service-name chambape-api-service `
  --task-definition chambape-api-task `
  --desired-count 1 `
  --launch-type FARGATE `
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1A,$SUBNET_1B],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" `
  --load-balancers "targetGroupArn=$TG_ARN,containerName=chambape-api,containerPort=3000"
```

### Paso 14: Obtener URL de la Aplicación

```powershell
# Obtener DNS del Load Balancer
$ALB_DNS = aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --query 'LoadBalancers[0].DNSName' --output text
Write-Host "Application URL: http://$ALB_DNS"
```

## 🔍 Verificación del Despliegue

### Verificar Servicios

```powershell
# Verificar estado del servicio ECS
aws ecs describe-services --cluster chambape-cluster --services chambape-api-service

# Verificar tareas en ejecución
aws ecs list-tasks --cluster chambape-cluster --service-name chambape-api-service

# Verificar logs
aws logs describe-log-groups --log-group-name-prefix /ecs/chambape-api
```

### Pruebas de Endpoints

```powershell
# Probar endpoint de salud
Invoke-RestMethod -Uri "http://$ALB_DNS/api/health" -Method GET

# Probar documentación API
Start-Process "http://$ALB_DNS/docs"
```

## 🎯 Siguientes Pasos

### 1. Configurar Dominio (Opcional)
- Configurar Route 53 para dominio personalizado
- Crear certificado SSL con ACM
- Actualizar ALB para usar HTTPS

### 2. Configurar Monitoreo
- Configurar CloudWatch dashboards
- Crear alarmas para métricas clave
- Configurar notificaciones SNS

### 3. Configurar CI/CD
- Configurar secrets en GitHub
- Habilitar workflows automáticos
- Configurar environments en GitHub

### 4. Optimización
- Configurar Auto Scaling
- Implementar caché con ElastiCache
- Configurar WAF para seguridad

## 🚨 Notas Importantes

1. **Seguridad**: Cambiar todas las contraseñas por defecto antes de producción
2. **Costos**: Monitorear costos regularmente usando AWS Cost Explorer
3. **Respaldos**: Configurar respaldos automáticos para RDS
4. **Logs**: Configurar retención de logs apropiada
5. **Secretos**: Nunca hardcodear secretos en el código

## 🆘 Solución de Problemas

### Si el servicio no inicia:
```powershell
# Verificar logs del contenedor
aws logs get-log-events --log-group-name /ecs/chambape-api --log-stream-name [stream-name]
```

### Si no se puede conectar a la base de datos:
```powershell
# Verificar grupos de seguridad
aws ec2 describe-security-groups --group-ids $RDS_SG $ECS_SG
```

### Si hay problemas con ECR:
```powershell
# Re-autenticarse
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin $ECR_URI
```

---

**¡Listo!** Tu aplicación ChambaPE debería estar ejecutándose en AWS. 🎉
