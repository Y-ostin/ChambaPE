#!/bin/bash

# Script para crear y configurar instancia EC2 en AWS
# Ejecutar: ./scripts/setup-ec2.sh

set -e

echo "🚀 Configurando instancia EC2 en AWS..."

# Variables de configuración
INSTANCE_NAME="chambape-api-server"
INSTANCE_TYPE="t3.micro"  # Para desarrollo, cambiar a t3.small para producción
AMI_ID="ami-0c02fb55956c7d316"  # Ubuntu 22.04 LTS en us-east-1
KEY_NAME="chambape-key"
SECURITY_GROUP_NAME="chambape-api-sg"
VPC_ID=""
SUBNET_ID=""

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

# Obtener subnet pública
SUBNET_ID=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=map-public-ip-on-launch,Values=true" \
    --query 'Subnets[0].SubnetId' --output text)

if [ "$SUBNET_ID" = "None" ] || [ -z "$SUBNET_ID" ]; then
    print_error "No se encontró subnet pública. Por favor crea una subnet pública primero."
    exit 1
fi

print_status "Subnet encontrada: $SUBNET_ID"

# Crear par de claves SSH
print_status "Creando par de claves SSH..."

aws ec2 create-key-pair \
    --key-name "$KEY_NAME" \
    --query 'KeyMaterial' \
    --output text > "$KEY_NAME.pem" 2>/dev/null || print_warning "Par de claves ya existe"

if [ -f "$KEY_NAME.pem" ]; then
    chmod 400 "$KEY_NAME.pem"
    print_status "Clave privada guardada en: $KEY_NAME.pem"
fi

# Crear Security Group para la API
print_status "Creando Security Group para la API..."

aws ec2 create-security-group \
    --group-name "$SECURITY_GROUP_NAME" \
    --description "Security group for ChambaPE API server" \
    --vpc-id "$VPC_ID" \
    --output text > /dev/null 2>&1 || print_warning "Security group ya existe"

# Obtener Security Group ID
SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" \
    --query 'SecurityGroups[0].GroupId' --output text)

# Configurar reglas de seguridad
print_status "Configurando reglas de seguridad..."

# SSH (puerto 22)
aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0 \
    --output text > /dev/null 2>&1 || print_warning "Regla SSH ya existe"

# HTTP (puerto 80)
aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --output text > /dev/null 2>&1 || print_warning "Regla HTTP ya existe"

# HTTPS (puerto 443)
aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --output text > /dev/null 2>&1 || print_warning "Regla HTTPS ya existe"

# API (puerto 3000)
aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port 3000 \
    --cidr 0.0.0.0/0 \
    --output text > /dev/null 2>&1 || print_warning "Regla API ya existe"

# Crear script de inicialización
print_status "Creando script de inicialización..."

cat > user-data.sh << 'EOF'
#!/bin/bash
set -e

# Actualizar sistema
apt-get update
apt-get upgrade -y

# Instalar dependencias básicas
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Instalar PM2 globalmente
npm install -g pm2

# Instalar Docker (opcional, para contenedores)
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

# Instalar Nginx
apt-get install -y nginx

# Configurar Nginx como proxy reverso
cat > /etc/nginx/sites-available/chambape-api << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

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
    }
}
NGINX_EOF

# Habilitar sitio
ln -sf /etc/nginx/sites-available/chambape-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx
systemctl enable nginx

# Crear directorio para la aplicación
mkdir -p /opt/chambape-api
chown ubuntu:ubuntu /opt/chambape-api

# Configurar firewall básico
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Crear usuario para la aplicación
useradd -r -s /bin/false chambape || true

# Configurar logs
mkdir -p /var/log/chambape-api
chown chambape:chambape /var/log/chambape-api

echo "✅ Inicialización del servidor completada"
EOF

# Crear instancia EC2
print_status "Creando instancia EC2..."

INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --count 1 \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SG_ID" \
    --subnet-id "$SUBNET_ID" \
    --associate-public-ip-address \
    --user-data file://user-data.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --query 'Instances[0].InstanceId' \
    --output text)

print_status "Esperando a que la instancia esté en ejecución..."

aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"

# Obtener IP pública
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

print_status "✅ Instancia EC2 configurada exitosamente!"
echo ""
echo "📋 Información de la instancia:"
echo "   ID: $INSTANCE_ID"
echo "   IP Pública: $PUBLIC_IP"
echo "   Tipo: $INSTANCE_TYPE"
echo "   AMI: $AMI_ID"
echo ""
echo "🔧 Comandos útiles:"
echo "   Conectar por SSH: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo "   Ver logs: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP 'sudo journalctl -u nginx'"
echo ""
print_warning "⚠️  IMPORTANTE: Guarda la IP pública: $PUBLIC_IP"
print_warning "⚠️  La clave privada está en: $KEY_NAME.pem"
print_warning "⚠️  El servidor estará listo en unos minutos después de la inicialización" 