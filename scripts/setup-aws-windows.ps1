# Script de PowerShell para configurar AWS en Windows
# Ejecutar: .\scripts\setup-aws-windows.ps1

param(
    [string]$Region = "us-east-1",
    [string]$ProjectName = "chambape"
)

Write-Host "🚀 Configurando infraestructura AWS para ChambaPE..." -ForegroundColor Green

# Verificar dependencias
Write-Host "📋 Verificando dependencias..." -ForegroundColor Blue

# Verificar AWS CLI
try {
    $awsVersion = aws --version
    Write-Host "✅ AWS CLI encontrado: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI no está instalado. Por favor instálalo primero." -ForegroundColor Red
    Write-Host "Descarga desde: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Verificar autenticación AWS
try {
    $callerIdentity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "✅ Autenticado en AWS como: $($callerIdentity.Arn)" -ForegroundColor Green
} catch {
    Write-Host "❌ No estás autenticado en AWS. Ejecuta 'aws configure' primero." -ForegroundColor Red
    exit 1
}

# Verificar Docker
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker encontrado: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker no está instalado. Por favor instálalo primero." -ForegroundColor Red
    Write-Host "Descarga desde: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🏗️ Iniciando configuración de infraestructura..." -ForegroundColor Blue

# Crear directorio de scripts si no existe
if (!(Test-Path "scripts")) {
    New-Item -ItemType Directory -Path "scripts"
}

# Función para crear script de RDS
function Create-RDSScript {
    Write-Host "📝 Creando script de configuración RDS..." -ForegroundColor Blue
    
    $rdsScript = @"
#!/bin/bash

# Script para crear y configurar RDS PostgreSQL en AWS
set -e

echo "🚀 Configurando RDS PostgreSQL en AWS..."

# Variables de configuración
DB_INSTANCE_IDENTIFIER="chambape-db"
DB_NAME="chambape_db"
DB_USERNAME="chambape_user"
DB_PASSWORD="ChambaPE2024!Secure"
DB_INSTANCE_CLASS="db.t3.micro"
DB_ENGINE="postgres"
DB_ENGINE_VERSION="15.4"
DB_ALLOCATED_STORAGE="20"
DB_STORAGE_TYPE="gp2"
DB_SUBNET_GROUP_NAME="chambape-db-subnet-group"
DB_SECURITY_GROUP_NAME="chambape-db-sg"

# Obtener VPC por defecto
VPC_ID=`$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)

# Obtener subnets
SUBNET_IDS=`$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=`$VPC_ID" --query 'Subnets[0:2].SubnetId' --output text | tr '\t' ',')

# Crear Security Group
aws ec2 create-security-group --group-name "`$DB_SECURITY_GROUP_NAME" --description "Security group for ChambaPE RDS" --vpc-id "`$VPC_ID" --output text > /dev/null 2>&1 || echo "Security group ya existe"

SG_ID=`$(aws ec2 describe-security-groups --filters "Name=group-name,Values=`$DB_SECURITY_GROUP_NAME" --query 'SecurityGroups[0].GroupId' --output text)

# Configurar reglas
aws ec2 authorize-security-group-ingress --group-id "`$SG_ID" --protocol tcp --port 5432 --source-group "`$SG_ID" --output text > /dev/null 2>&1 || echo "Regla ya existe"

# Crear Subnet Group
aws rds create-db-subnet-group --db-subnet-group-name "`$DB_SUBNET_GROUP_NAME" --db-subnet-group-description "Subnet group for ChambaPE RDS" --subnet-ids `$SUBNET_IDS --output text > /dev/null 2>&1 || echo "Subnet group ya existe"

# Crear instancia RDS
aws rds create-db-instance --db-instance-identifier "`$DB_INSTANCE_IDENTIFIER" --db-instance-class "`$DB_INSTANCE_CLASS" --engine "`$DB_ENGINE" --engine-version "`$DB_ENGINE_VERSION" --master-username "`$DB_USERNAME" --master-user-password "`$DB_PASSWORD" --allocated-storage "`$DB_ALLOCATED_STORAGE" --storage-type "`$DB_STORAGE_TYPE" --db-name "`$DB_NAME" --vpc-security-group-ids "`$SG_ID" --db-subnet-group-name "`$DB_SUBNET_GROUP_NAME" --backup-retention-period 7 --storage-encrypted --deletion-protection --output text > /dev/null 2>&1 || echo "Instancia RDS ya existe"

echo "Esperando a que la instancia RDS esté disponible..."
aws rds wait db-instance-available --db-instance-identifier "`$DB_INSTANCE_IDENTIFIER"

# Obtener endpoint
DB_ENDPOINT=`$(aws rds describe-db-instances --db-instance-identifier "`$DB_INSTANCE_IDENTIFIER" --query 'DBInstances[0].Endpoint.Address' --output text)

echo "✅ RDS PostgreSQL configurado exitosamente!"
echo "Endpoint: `$DB_ENDPOINT"
echo "Usuario: `$DB_USERNAME"
echo "Contraseña: `$DB_PASSWORD"
"@

    $rdsScript | Out-File -FilePath "scripts/setup-rds.sh" -Encoding UTF8
    Write-Host "✅ Script RDS creado: scripts/setup-rds.sh" -ForegroundColor Green
}

# Función para crear script de S3
function Create-S3Script {
    Write-Host "📝 Creando script de configuración S3..." -ForegroundColor Blue
    
    $s3Script = @"
#!/bin/bash

# Script para crear bucket S3 en AWS
set -e

echo "🚀 Configurando bucket S3 en AWS..."

# Variables
BUCKET_NAME="chambape-uploads-`$(date +%s)"
REGION="$Region"

# Crear bucket
aws s3api create-bucket --bucket "`$BUCKET_NAME" --region "`$REGION" --output text > /dev/null 2>&1 || echo "Bucket ya existe"

# Habilitar versionado
aws s3api put-bucket-versioning --bucket "`$BUCKET_NAME" --versioning-configuration Status="Enabled" --output text > /dev/null 2>&1 || echo "Error al habilitar versionado"

# Configurar encriptación
aws s3api put-bucket-encryption --bucket "`$BUCKET_NAME" --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' --output text > /dev/null 2>&1 || echo "Error al configurar encriptación"

# Configurar CORS
aws s3api put-bucket-cors --bucket "`$BUCKET_NAME" --cors-configuration '{"CORSRules":[{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","POST","DELETE","HEAD"],"AllowedOrigins":["*"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3000}]}' --output text > /dev/null 2>&1 || echo "Error al configurar CORS"

# Crear carpetas
aws s3api put-object --bucket "`$BUCKET_NAME" --key "uploads/" --output text > /dev/null 2>&1
aws s3api put-object --bucket "`$BUCKET_NAME" --key "temp/" --output text > /dev/null 2>&1
aws s3api put-object --bucket "`$BUCKET_NAME" --key "documents/" --output text > /dev/null 2>&1
aws s3api put-object --bucket "`$BUCKET_NAME" --key "images/" --output text > /dev/null 2>&1

echo "✅ Bucket S3 configurado exitosamente!"
echo "Nombre del bucket: `$BUCKET_NAME"
echo "Región: `$REGION"
"@

    $s3Script | Out-File -FilePath "scripts/setup-s3.sh" -Encoding UTF8
    Write-Host "✅ Script S3 creado: scripts/setup-s3.sh" -ForegroundColor Green
}

# Función para crear script de EC2
function Create-EC2Script {
    Write-Host "📝 Creando script de configuración EC2..." -ForegroundColor Blue
    
    $ec2Script = @"
#!/bin/bash

# Script para crear instancia EC2 en AWS
set -e

echo "🚀 Configurando instancia EC2 en AWS..."

# Variables
INSTANCE_NAME="chambape-api-server"
INSTANCE_TYPE="t3.micro"
AMI_ID="ami-0c02fb55956c7d316"
KEY_NAME="chambape-key"
SECURITY_GROUP_NAME="chambape-api-sg"

# Obtener VPC por defecto
VPC_ID=`$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)

# Obtener subnet pública
SUBNET_ID=`$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=`$VPC_ID" "Name=map-public-ip-on-launch,Values=true" --query 'Subnets[0].SubnetId' --output text)

# Crear par de claves
aws ec2 create-key-pair --key-name "`$KEY_NAME" --query 'KeyMaterial' --output text > "`$KEY_NAME.pem" 2>/dev/null || echo "Par de claves ya existe"

if [ -f "`$KEY_NAME.pem" ]; then
    chmod 400 "`$KEY_NAME.pem"
fi

# Crear Security Group
aws ec2 create-security-group --group-name "`$SECURITY_GROUP_NAME" --description "Security group for ChambaPE API" --vpc-id "`$VPC_ID" --output text > /dev/null 2>&1 || echo "Security group ya existe"

SG_ID=`$(aws ec2 describe-security-groups --filters "Name=group-name,Values=`$SECURITY_GROUP_NAME" --query 'SecurityGroups[0].GroupId' --output text)

# Configurar reglas
aws ec2 authorize-security-group-ingress --group-id "`$SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 --output text > /dev/null 2>&1 || echo "Regla SSH ya existe"
aws ec2 authorize-security-group-ingress --group-id "`$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 --output text > /dev/null 2>&1 || echo "Regla HTTP ya existe"
aws ec2 authorize-security-group-ingress --group-id "`$SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0 --output text > /dev/null 2>&1 || echo "Regla HTTPS ya existe"
aws ec2 authorize-security-group-ingress --group-id "`$SG_ID" --protocol tcp --port 3000 --cidr 0.0.0.0/0 --output text > /dev/null 2>&1 || echo "Regla API ya existe"

# Crear instancia EC2
INSTANCE_ID=`$(aws ec2 run-instances --image-id "`$AMI_ID" --count 1 --instance-type "`$INSTANCE_TYPE" --key-name "`$KEY_NAME" --security-group-ids "`$SG_ID" --subnet-id "`$SUBNET_ID" --associate-public-ip-address --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=`$INSTANCE_NAME}]" --query 'Instances[0].InstanceId' --output text)

echo "Esperando a que la instancia esté en ejecución..."
aws ec2 wait instance-running --instance-ids "`$INSTANCE_ID"

# Obtener IP pública
PUBLIC_IP=`$(aws ec2 describe-instances --instance-ids "`$INSTANCE_ID" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "✅ Instancia EC2 configurada exitosamente!"
echo "ID: `$INSTANCE_ID"
echo "IP Pública: `$PUBLIC_IP"
echo "Clave privada: `$KEY_NAME.pem"
"@

    $ec2Script | Out-File -FilePath "scripts/setup-ec2.sh" -Encoding UTF8
    Write-Host "✅ Script EC2 creado: scripts/setup-ec2.sh" -ForegroundColor Green
}

# Función para crear script de despliegue
function Create-DeployScript {
    Write-Host "📝 Creando script de despliegue..." -ForegroundColor Blue
    
    $deployScript = @"
#!/bin/bash

# Script para desplegar la aplicación
set -e

echo "🚀 Desplegando ChambaPE API en AWS..."

# Variables
PROJECT_NAME="chambape-api"
DOCKER_IMAGE_NAME="chambape-api"
DOCKER_TAG="latest"

# Verificar Dockerfile
if [ ! -f "Dockerfile.aws" ]; then
    echo "❌ Dockerfile.aws no encontrado"
    exit 1
fi

# Construir imagen
echo "📦 Construyendo imagen Docker..."
docker build -f Dockerfile.aws -t "`$DOCKER_IMAGE_NAME:`$DOCKER_TAG" .

# Guardar imagen
echo "💾 Guardando imagen..."
docker save "`$DOCKER_IMAGE_NAME:`$DOCKER_TAG" | gzip > "`$DOCKER_IMAGE_NAME.tar.gz"

echo "✅ Imagen construida y guardada"
echo "📋 Próximo paso: Transferir archivos al servidor EC2"
"@

    $deployScript | Out-File -FilePath "scripts/deploy-to-aws.sh" -Encoding UTF8
    Write-Host "✅ Script de despliegue creado: scripts/deploy-to-aws.sh" -ForegroundColor Green
}

# Crear todos los scripts
Create-RDSScript
Create-S3Script
Create-EC2Script
Create-DeployScript

Write-Host "`n🎉 ¡Scripts creados exitosamente!" -ForegroundColor Green
Write-Host "`n📋 Próximos pasos:" -ForegroundColor Blue
Write-Host "1. Ejecutar los scripts en WSL o Git Bash:" -ForegroundColor White
Write-Host "   - chmod +x scripts/*.sh" -ForegroundColor Gray
Write-Host "   - ./scripts/setup-rds.sh" -ForegroundColor Gray
Write-Host "   - ./scripts/setup-s3.sh" -ForegroundColor Gray
Write-Host "   - ./scripts/setup-ec2.sh" -ForegroundColor Gray
Write-Host "2. Configurar archivo .env.production" -ForegroundColor White
Write-Host "3. Ejecutar: ./scripts/deploy-to-aws.sh" -ForegroundColor White

Write-Host "`n💡 Tip: Instala WSL2 para ejecutar scripts bash en Windows" -ForegroundColor Yellow
Write-Host "   wsl --install" -ForegroundColor Gray 