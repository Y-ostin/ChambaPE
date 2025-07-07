#!/bin/bash
# 🚀 Script de Deploy Automático para ChambaPE en AWS

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
REGION="us-east-2"
CLUSTER_NAME="chambape-cluster"
SERVICE_NAME="chambape-service"
TASK_FAMILY="chambape-task"
ECR_REPO_NAME="chambape-api"

echo -e "${BLUE}🚀 Iniciando deploy de ChambaPE en AWS...${NC}"

# Obtener Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO_NAME}"

echo -e "${YELLOW}📋 Configuración:${NC}"
echo "  - Account ID: $ACCOUNT_ID"
echo "  - Region: $REGION"
echo "  - ECR URI: $ECR_URI"

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar dependencias
echo -e "${BLUE}🔍 Verificando dependencias...${NC}"

if ! command_exists aws; then
    echo -e "${RED}❌ AWS CLI no está instalado${NC}"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencias verificadas${NC}"

# Verificar conexión AWS
echo -e "${BLUE}🔐 Verificando conexión AWS...${NC}"
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ No se puede conectar a AWS. Verifica tus credenciales.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Conectado a AWS${NC}"

# Crear ECR repository si no existe
echo -e "${BLUE}📦 Verificando repositorio ECR...${NC}"
if ! aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $REGION > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ Repositorio ECR no existe. Creando...${NC}"
    aws ecr create-repository --repository-name $ECR_REPO_NAME --region $REGION
    echo -e "${GREEN}✅ Repositorio ECR creado${NC}"
else
    echo -e "${GREEN}✅ Repositorio ECR existe${NC}"
fi

# Login a ECR
echo -e "${BLUE}🔑 Autenticando con ECR...${NC}"
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI

# Construir imagen Docker
echo -e "${BLUE}🏗️ Construyendo imagen Docker...${NC}"
docker build -f Dockerfile.aws -t $ECR_REPO_NAME:latest .

# Tagear imagen
echo -e "${BLUE}🏷️ Tageando imagen...${NC}"
docker tag $ECR_REPO_NAME:latest $ECR_URI:latest
docker tag $ECR_REPO_NAME:latest $ECR_URI:$(date +%Y%m%d-%H%M%S)

# Subir imagen a ECR
echo -e "${BLUE}📤 Subiendo imagen a ECR...${NC}"
docker push $ECR_URI:latest
docker push $ECR_URI:$(date +%Y%m%d-%H%M%S)

echo -e "${GREEN}✅ Imagen subida exitosamente${NC}"

# Verificar si el cluster existe
echo -e "${BLUE}🔍 Verificando cluster ECS...${NC}"
if ! aws ecs describe-clusters --clusters $CLUSTER_NAME --region $REGION | grep -q "ACTIVE"; then
    echo -e "${YELLOW}⚠️ Cluster ECS no existe o no está activo.${NC}"
    echo -e "${YELLOW}Por favor, crea el cluster primero usando CDK o la consola AWS.${NC}"
    exit 1
fi

# Verificar si el servicio existe
echo -e "${BLUE}🔍 Verificando servicio ECS...${NC}"
if aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION | grep -q "ACTIVE"; then
    echo -e "${BLUE}🔄 Actualizando servicio existente...${NC}"
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $SERVICE_NAME \
        --force-new-deployment \
        --region $REGION
    
    echo -e "${YELLOW}⏳ Esperando que el servicio se actualice...${NC}"
    aws ecs wait services-stable --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION
    
else
    echo -e "${YELLOW}⚠️ Servicio ECS no existe.${NC}"
    echo -e "${YELLOW}Por favor, crea el servicio primero usando CDK o la consola AWS.${NC}"
    exit 1
fi

# Obtener URL del Load Balancer
echo -e "${BLUE}🌐 Obteniendo URL de la aplicación...${NC}"
ALB_DNS=$(aws elbv2 describe-load-balancers --names chambape-alb --query 'LoadBalancers[0].DNSName' --output text --region $REGION 2>/dev/null || echo "No encontrado")

echo -e "${GREEN}🎉 ¡Deploy completado exitosamente!${NC}"
echo -e "${BLUE}📊 Información del deploy:${NC}"
echo "  - Imagen: $ECR_URI:latest"
echo "  - Cluster: $CLUSTER_NAME"
echo "  - Servicio: $SERVICE_NAME"
if [ "$ALB_DNS" != "No encontrado" ]; then
    echo "  - URL: http://$ALB_DNS"
    echo "  - API Docs: http://$ALB_DNS/docs"
else
    echo "  - URL: Configura el Load Balancer para obtener la URL"
fi

echo -e "${YELLOW}📝 Próximos pasos:${NC}"
echo "  1. Verificar que el servicio esté corriendo: aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME"
echo "  2. Verificar logs: aws logs tail /ecs/chambape-api --follow"
echo "  3. Probar la API: curl http://$ALB_DNS/api"

echo -e "${GREEN}✅ Script completado${NC}"
