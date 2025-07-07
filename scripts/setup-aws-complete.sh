#!/bin/bash

# Script completo para configurar toda la infraestructura AWS
# Ejecutar: ./scripts/setup-aws-complete.sh

set -e

echo "🚀 Configurando infraestructura completa de AWS para ChambaPE..."

# Variables de configuración
REGION="us-east-1"
PROJECT_NAME="chambape"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Verificar dependencias
check_dependencies() {
    print_step "Verificando dependencias..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI no está instalado. Por favor instálalo primero."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "No estás autenticado en AWS. Ejecuta 'aws configure' primero."
        exit 1
    fi
    
    print_status "✅ Dependencias verificadas"
}

# Crear usuario IAM para la aplicación
create_iam_user() {
    print_step "Creando usuario IAM para la aplicación..."
    
    USER_NAME="${PROJECT_NAME}-app-user"
    
    # Crear usuario
    aws iam create-user --user-name "$USER_NAME" --output text > /dev/null 2>&1 || print_warning "Usuario IAM ya existe"
    
    # Crear política personalizada para S3
    cat > s3-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${PROJECT_NAME}-uploads-*",
                "arn:aws:s3:::${PROJECT_NAME}-uploads-*/*"
            ]
        }
    ]
}
EOF
    
    # Crear política
    aws iam create-policy \
        --policy-name "${PROJECT_NAME}-s3-policy" \
        --policy-document file://s3-policy.json \
        --output text > /dev/null 2>&1 || print_warning "Política S3 ya existe"
    
    # Adjuntar políticas
    aws iam attach-user-policy \
        --user-name "$USER_NAME" \
        --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/${PROJECT_NAME}-s3-policy" \
        --output text > /dev/null 2>&1 || print_warning "Política ya adjunta"
    
    # Crear access key
    ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name "$USER_NAME" --output json 2>/dev/null || echo "{}")
    
    if [ "$ACCESS_KEY_OUTPUT" != "{}" ]; then
        ACCESS_KEY_ID=$(echo "$ACCESS_KEY_OUTPUT" | jq -r '.AccessKey.AccessKeyId')
        SECRET_ACCESS_KEY=$(echo "$ACCESS_KEY_OUTPUT" | jq -r '.AccessKey.SecretAccessKey')
        
        print_status "✅ Usuario IAM creado: $USER_NAME"
        print_warning "⚠️  Guarda estas credenciales de forma segura:"
        echo "ACCESS_KEY_ID=$ACCESS_KEY_ID"
        echo "SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY"
    else
        print_warning "⚠️  No se pudo crear access key, puede que ya exista"
    fi
    
    # Limpiar archivo temporal
    rm -f s3-policy.json
}

# Configurar RDS
setup_rds() {
    print_step "Configurando RDS PostgreSQL..."
    
    # Ejecutar script de RDS
    if [ -f "scripts/setup-rds.sh" ]; then
        chmod +x scripts/setup-rds.sh
        ./scripts/setup-rds.sh
    else
        print_error "Script de RDS no encontrado"
        exit 1
    fi
}

# Configurar S3
setup_s3() {
    print_step "Configurando bucket S3..."
    
    # Ejecutar script de S3
    if [ -f "scripts/setup-s3.sh" ]; then
        chmod +x scripts/setup-s3.sh
        ./scripts/setup-s3.sh
    else
        print_error "Script de S3 no encontrado"
        exit 1
    fi
}

# Configurar EC2
setup_ec2() {
    print_step "Configurando instancia EC2..."
    
    # Ejecutar script de EC2
    if [ -f "scripts/setup-ec2.sh" ]; then
        chmod +x scripts/setup-ec2.sh
        ./scripts/setup-ec2.sh
    else
        print_error "Script de EC2 no encontrado"
        exit 1
    fi
}

# Crear archivo de configuración
create_env_file() {
    print_step "Creando archivo de configuración..."
    
    # Leer información de los recursos creados
    echo "📝 Configurando archivo .env.production..."
    
    # Solicitar información al usuario
    echo -n "Ingresa el endpoint de RDS: "
    read RDS_ENDPOINT
    
    echo -n "Ingresa el nombre del bucket S3: "
    read S3_BUCKET
    
    echo -n "Ingresa la IP de EC2: "
    read EC2_IP
    
    echo -n "Ingresa el Access Key ID: "
    read ACCESS_KEY_ID
    
    echo -n "Ingresa el Secret Access Key: "
    read -s SECRET_ACCESS_KEY
    echo
    
    # Crear archivo de configuración
    cat > .env.production << EOF
# Configuración de producción para AWS
NODE_ENV=production
APP_PORT=3000
APP_NAME="ChambaPE API"
API_PREFIX=api
APP_FALLBACK_LANGUAGE=es
APP_HEADER_LANGUAGE=x-custom-lang
FRONTEND_DOMAIN=https://your-flutter-app-domain.com
BACKEND_DOMAIN=http://$EC2_IP

# Base de datos PostgreSQL en AWS RDS
DATABASE_TYPE=postgres
DATABASE_HOST=$RDS_ENDPOINT
DATABASE_PORT=5432
DATABASE_USERNAME=chambape_user
DATABASE_PASSWORD=ChambaPE2024!Secure
DATABASE_NAME=chambape_db
DATABASE_SYNCHRONIZE=false
DATABASE_MAX_CONNECTIONS=100
DATABASE_SSL_ENABLED=true
DATABASE_REJECT_UNAUTHORIZED=false
DATABASE_CA=
DATABASE_KEY=
DATABASE_CERT=
DATABASE_URL=postgresql://chambape_user:ChambaPE2024!Secure@$RDS_ENDPOINT:5432/chambape_db

# Almacenamiento de archivos en AWS S3
FILE_DRIVER=s3
ACCESS_KEY_ID=$ACCESS_KEY_ID
SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY
AWS_S3_REGION=$REGION
AWS_DEFAULT_S3_BUCKET=$S3_BUCKET

# Configuración de correo (AWS SES)
MAIL_HOST=email-smtp.$REGION.amazonaws.com
MAIL_PORT=587
MAIL_USER=your_ses_smtp_username
MAIL_PASSWORD=your_ses_smtp_password
MAIL_IGNORE_TLS=false
MAIL_SECURE=true
MAIL_REQUIRE_TLS=true
MAIL_DEFAULT_EMAIL=noreply@chambape.com
MAIL_DEFAULT_NAME=ChambaPE
MAIL_CLIENT_PORT=1080

# JWT Secrets (generar nuevos para producción)
AUTH_JWT_SECRET=chambape_jwt_secret_production_2024_very_secure_key_$(date +%s)
AUTH_JWT_TOKEN_EXPIRES_IN=15m
AUTH_REFRESH_SECRET=chambape_refresh_secret_production_2024_very_secure_key_$(date +%s)
AUTH_REFRESH_TOKEN_EXPIRES_IN=3650d
AUTH_FORGOT_SECRET=chambape_forgot_secret_production_2024_very_secure_key_$(date +%s)
AUTH_FORGOT_TOKEN_EXPIRES_IN=30m
AUTH_CONFIRM_EMAIL_SECRET=chambape_confirm_email_secret_production_2024_very_secure_key_$(date +%s)
AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN=1d

# OAuth (opcional)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

APPLE_APP_AUDIENCE=[]

# Redis para sesiones y cache (AWS ElastiCache - opcional)
WORKER_HOST=redis://your-elasticache-endpoint.$REGION.cache.amazonaws.com:6379/1

# Configuración adicional para AWS
AWS_REGION=$REGION
AWS_CLOUDWATCH_LOG_GROUP=/aws/ecs/chambape-api
AWS_CLOUDWATCH_LOG_STREAM=chambape-api-logs

# Configuración de logs
LOG_LEVEL=info
LOG_FORMAT=json

# Configuración de rate limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Configuración de CORS
CORS_ORIGIN=*
CORS_CREDENTIALS=true

# Configuración de seguridad
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
EOF
    
    print_status "✅ Archivo .env.production creado"
}

# Mostrar resumen
show_summary() {
    print_step "Resumen de la configuración..."
    
    echo ""
    echo "🎉 ¡Configuración de AWS completada!"
    echo ""
    echo "📋 Recursos creados:"
    echo "   ✅ Usuario IAM: ${PROJECT_NAME}-app-user"
    echo "   ✅ Base de datos RDS: chambape-db"
    echo "   ✅ Bucket S3: $S3_BUCKET"
    echo "   ✅ Instancia EC2: chambape-api-server"
    echo "   ✅ Archivo de configuración: .env.production"
    echo ""
    echo "🔧 Próximos pasos:"
    echo "   1. Verificar que todos los recursos estén funcionando"
    echo "   2. Ejecutar: ./scripts/deploy-to-aws.sh"
    echo "   3. Configurar dominio y SSL (opcional)"
    echo ""
    echo "📊 URLs importantes:"
    echo "   API: http://$EC2_IP"
    echo "   Health Check: http://$EC2_IP/health"
    echo "   Documentación: http://$EC2_IP/api/docs"
    echo ""
    print_warning "⚠️  IMPORTANTE: Guarda todas las credenciales de forma segura!"
}

# Función principal
main() {
    echo "🚀 Iniciando configuración completa de AWS..."
    echo ""
    
    check_dependencies
    create_iam_user
    setup_rds
    setup_s3
    setup_ec2
    create_env_file
    show_summary
    
    echo ""
    print_status "🎉 ¡Configuración completada! Ahora puedes desplegar tu aplicación."
}

# Ejecutar función principal
main "$@" 