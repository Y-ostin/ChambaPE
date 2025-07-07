#!/bin/bash

# Script para crear y configurar RDS PostgreSQL en AWS
# Ejecutar: ./scripts/setup-rds.sh

set -e

echo "🚀 Configurando RDS PostgreSQL en AWS..."

# Variables de configuración
DB_INSTANCE_IDENTIFIER="chambape-db"
DB_NAME="chambape_db"
DB_USERNAME="chambape_user"
DB_PASSWORD="ChambaPE2024!Secure"
DB_INSTANCE_CLASS="db.t3.micro"  # Para desarrollo, cambiar a db.t3.small para producción
DB_ENGINE="postgres"
DB_ENGINE_VERSION="15.4"
DB_ALLOCATED_STORAGE="20"
DB_STORAGE_TYPE="gp2"
DB_SUBNET_GROUP_NAME="chambape-db-subnet-group"
DB_SECURITY_GROUP_NAME="chambape-db-sg"
VPC_ID=""
SUBNET_IDS=""

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

# Obtener VPC por defecto
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)

if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
    print_error "No se encontró VPC por defecto. Por favor crea una VPC primero."
    exit 1
fi

print_status "VPC encontrada: $VPC_ID"

# Obtener subnets privadas
SUBNET_IDS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=map-public-ip-on-launch,Values=false" \
    --query 'Subnets[*].SubnetId' --output text | tr '\t' ',')

if [ -z "$SUBNET_IDS" ]; then
    print_warning "No se encontraron subnets privadas. Usando subnets públicas..."
    SUBNET_IDS=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$VPC_ID" \
        --query 'Subnets[0:2].SubnetId' --output text | tr '\t' ',')
fi

print_status "Subnets encontradas: $SUBNET_IDS"

# Crear Security Group para RDS
print_status "Creando Security Group para RDS..."

aws ec2 create-security-group \
    --group-name "$DB_SECURITY_GROUP_NAME" \
    --description "Security group for ChambaPE RDS database" \
    --vpc-id "$VPC_ID" \
    --output text > /dev/null 2>&1 || print_warning "Security group ya existe"

# Obtener Security Group ID
SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$DB_SECURITY_GROUP_NAME" \
    --query 'SecurityGroups[0].GroupId' --output text)

# Agregar regla para permitir tráfico PostgreSQL desde EC2
print_status "Configurando reglas de seguridad..."

aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port 5432 \
    --source-group "$SG_ID" \
    --output text > /dev/null 2>&1 || print_warning "Regla ya existe"

# Crear Subnet Group para RDS
print_status "Creando Subnet Group para RDS..."

aws rds create-db-subnet-group \
    --db-subnet-group-name "$DB_SUBNET_GROUP_NAME" \
    --db-subnet-group-description "Subnet group for ChambaPE RDS" \
    --subnet-ids $SUBNET_IDS \
    --output text > /dev/null 2>&1 || print_warning "Subnet group ya existe"

# Crear instancia RDS
print_status "Creando instancia RDS PostgreSQL..."

aws rds create-db-instance \
    --db-instance-identifier "$DB_INSTANCE_IDENTIFIER" \
    --db-instance-class "$DB_INSTANCE_CLASS" \
    --engine "$DB_ENGINE" \
    --engine-version "$DB_ENGINE_VERSION" \
    --master-username "$DB_USERNAME" \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage "$DB_ALLOCATED_STORAGE" \
    --storage-type "$DB_STORAGE_TYPE" \
    --db-name "$DB_NAME" \
    --vpc-security-group-ids "$SG_ID" \
    --db-subnet-group-name "$DB_SUBNET_GROUP_NAME" \
    --backup-retention-period 7 \
    --preferred-backup-window "03:00-04:00" \
    --preferred-maintenance-window "sun:04:00-sun:05:00" \
    --storage-encrypted \
    --deletion-protection \
    --output text > /dev/null 2>&1 || print_warning "Instancia RDS ya existe"

print_status "Esperando a que la instancia RDS esté disponible..."

# Esperar a que la instancia esté disponible
aws rds wait db-instance-available --db-instance-identifier "$DB_INSTANCE_IDENTIFIER"

# Obtener endpoint de la base de datos
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "$DB_INSTANCE_IDENTIFIER" \
    --query 'DBInstances[0].Endpoint.Address' --output text)

print_status "✅ RDS PostgreSQL configurado exitosamente!"
echo ""
echo "📋 Información de la base de datos:"
echo "   Endpoint: $DB_ENDPOINT"
echo "   Puerto: 5432"
echo "   Base de datos: $DB_NAME"
echo "   Usuario: $DB_USERNAME"
echo "   Contraseña: $DB_PASSWORD"
echo ""
echo "🔧 Configuración para .env:"
echo "DATABASE_HOST=$DB_ENDPOINT"
echo "DATABASE_PORT=5432"
echo "DATABASE_USERNAME=$DB_USERNAME"
echo "DATABASE_PASSWORD=$DB_PASSWORD"
echo "DATABASE_NAME=$DB_NAME"
echo "DATABASE_URL=postgresql://$DB_USERNAME:$DB_PASSWORD@$DB_ENDPOINT:5432/$DB_NAME"
echo ""
print_warning "⚠️  IMPORTANTE: Guarda esta información de forma segura!"
print_warning "⚠️  La contraseña es: $DB_PASSWORD" 