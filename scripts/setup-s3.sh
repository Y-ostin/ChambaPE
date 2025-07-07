#!/bin/bash

# Script para crear y configurar bucket S3 en AWS
# Ejecutar: ./scripts/setup-s3.sh

set -e

echo "🚀 Configurando bucket S3 en AWS..."

# Variables de configuración
BUCKET_NAME="chambape-uploads-$(date +%s)"
REGION="us-east-1"
VERSIONING="Enabled"
ENCRYPTION="AES256"
LIFECYCLE_DAYS="90"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que AWS CLI esté instalado
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI no está instalado. Por favor instálalo primero."
    exit 1
fi

# Verificar que el usuario esté autenticado en AWS
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "No estás autenticado en AWS. Ejecuta 'aws configure' primero."
    exit 1
fi

print_status "Verificando configuración de AWS..."

# Crear bucket S3
print_status "Creando bucket S3: $BUCKET_NAME"

if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --output text > /dev/null 2>&1 || print_warning "Bucket ya existe"
else
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION" \
        --output text > /dev/null 2>&1 || print_warning "Bucket ya existe"
fi

# Habilitar versionado
print_status "Habilitando versionado..."

aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status="$VERSIONING" \
    --output text > /dev/null 2>&1 || print_warning "Error al habilitar versionado"

# Configurar encriptación por defecto
print_status "Configurando encriptación por defecto..."

aws s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "'$ENCRYPTION'"
                }
            }
        ]
    }' \
    --output text > /dev/null 2>&1 || print_warning "Error al configurar encriptación"

# Configurar política de lifecycle para archivos temporales
print_status "Configurando política de lifecycle..."

aws s3api put-bucket-lifecycle-configuration \
    --bucket "$BUCKET_NAME" \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "DeleteOldVersions",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": "temp/"
                },
                "NoncurrentVersionExpiration": {
                    "NoncurrentDays": 30
                }
            },
            {
                "ID": "DeleteOldObjects",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": "temp/"
                },
                "Expiration": {
                    "Days": '$LIFECYCLE_DAYS'
                }
            }
        ]
    }' \
    --output text > /dev/null 2>&1 || print_warning "Error al configurar lifecycle"

# Configurar CORS para permitir acceso desde la aplicación
print_status "Configurando CORS..."

aws s3api put-bucket-cors \
    --bucket "$BUCKET_NAME" \
    --cors-configuration '{
        "CORSRules": [
            {
                "AllowedHeaders": ["*"],
                "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                "AllowedOrigins": ["*"],
                "ExposeHeaders": ["ETag"],
                "MaxAgeSeconds": 3000
            }
        ]
    }' \
    --output text > /dev/null 2>&1 || print_warning "Error al configurar CORS"

# Configurar política de bucket para acceso público limitado
print_status "Configurando política de bucket..."

aws s3api put-bucket-policy \
    --bucket "$BUCKET_NAME" \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::'$BUCKET_NAME'/*"
            }
        ]
    }' \
    --output text > /dev/null 2>&1 || print_warning "Error al configurar política"

# Crear carpetas principales
print_status "Creando estructura de carpetas..."

aws s3api put-object --bucket "$BUCKET_NAME" --key "uploads/" --output text > /dev/null 2>&1
aws s3api put-object --bucket "$BUCKET_NAME" --key "temp/" --output text > /dev/null 2>&1
aws s3api put-object --bucket "$BUCKET_NAME" --key "documents/" --output text > /dev/null 2>&1
aws s3api put-object --bucket "$BUCKET_NAME" --key "images/" --output text > /dev/null 2>&1

print_status "✅ Bucket S3 configurado exitosamente!"
echo ""
echo "📋 Información del bucket:"
echo "   Nombre: $BUCKET_NAME"
echo "   Región: $REGION"
echo "   URL: https://$BUCKET_NAME.s3.$REGION.amazonaws.com"
echo ""
echo "🔧 Configuración para .env:"
echo "FILE_DRIVER=s3"
echo "AWS_DEFAULT_S3_BUCKET=$BUCKET_NAME"
echo "AWS_S3_REGION=$REGION"
echo ""
print_warning "⚠️  IMPORTANTE: Guarda el nombre del bucket: $BUCKET_NAME"
print_warning "⚠️  Necesitarás configurar las credenciales AWS (ACCESS_KEY_ID y SECRET_ACCESS_KEY)" 