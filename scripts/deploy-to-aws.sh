#!/bin/bash

# Script completo para desplegar ChambaPE API en AWS
# Ejecutar: ./scripts/deploy-to-aws.sh

set -e

echo "🚀 Desplegando ChambaPE API en AWS..."

# Variables de configuración
PROJECT_NAME="chambape-api"
EC2_IP=""
EC2_KEY="chambape-key.pem"
DOCKER_IMAGE_NAME="chambape-api"
DOCKER_TAG="latest"

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
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker no está instalado. Por favor instálalo primero."
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI no está instalado. Por favor instálalo primero."
        exit 1
    fi
    
    if [ ! -f "$EC2_KEY" ]; then
        print_error "Clave SSH no encontrada: $EC2_KEY"
        print_error "Ejecuta primero: ./scripts/setup-ec2.sh"
        exit 1
    fi
    
    print_status "✅ Todas las dependencias están instaladas"
}

# Solicitar IP de EC2
get_ec2_ip() {
    if [ -z "$EC2_IP" ]; then
        echo -n "Ingresa la IP pública de tu instancia EC2: "
        read EC2_IP
    fi
    
    if [ -z "$EC2_IP" ]; then
        print_error "IP de EC2 es requerida"
        exit 1
    fi
    
    print_status "Usando IP de EC2: $EC2_IP"
}

# Construir imagen Docker
build_docker_image() {
    print_step "Construyendo imagen Docker..."
    
    # Verificar que existe el Dockerfile
    if [ ! -f "Dockerfile.aws" ]; then
        print_error "Dockerfile.aws no encontrado"
        exit 1
    fi
    
    # Construir imagen
    docker build -f Dockerfile.aws -t "$DOCKER_IMAGE_NAME:$DOCKER_TAG" .
    
    print_status "✅ Imagen Docker construida: $DOCKER_IMAGE_NAME:$DOCKER_TAG"
}

# Guardar imagen como tar
save_docker_image() {
    print_step "Guardando imagen Docker..."
    
    docker save "$DOCKER_IMAGE_NAME:$DOCKER_TAG" | gzip > "$DOCKER_IMAGE_NAME.tar.gz"
    
    print_status "✅ Imagen guardada: $DOCKER_IMAGE_NAME.tar.gz"
}

# Transferir archivos al servidor
transfer_files() {
    print_step "Transferiendo archivos al servidor..."
    
    # Crear directorio en el servidor
    ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no ubuntu@$EC2_IP "mkdir -p /opt/chambape-api"
    
    # Transferir imagen Docker
    scp -i "$EC2_KEY" -o StrictHostKeyChecking=no "$DOCKER_IMAGE_NAME.tar.gz" ubuntu@$EC2_IP:/opt/chambape-api/
    
    # Transferir archivos de configuración
    if [ -f ".env.production" ]; then
        scp -i "$EC2_KEY" -o StrictHostKeyChecking=no ".env.production" ubuntu@$EC2_IP:/opt/chambape-api/.env
    elif [ -f ".env" ]; then
        scp -i "$EC2_KEY" -o StrictHostKeyChecking=no ".env" ubuntu@$EC2_IP:/opt/chambape-api/.env
    else
        print_warning "No se encontró archivo .env, necesitarás configurarlo manualmente"
    fi
    
    # Transferir docker-compose si existe
    if [ -f "docker-compose.prod.yml" ]; then
        scp -i "$EC2_KEY" -o StrictHostKeyChecking=no "docker-compose.prod.yml" ubuntu@$EC2_IP:/opt/chambape-api/docker-compose.yml
    fi
    
    print_status "✅ Archivos transferidos al servidor"
}

# Crear script de despliegue en el servidor
create_deploy_script() {
    print_step "Creando script de despliegue en el servidor..."
    
    cat > deploy-server.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Desplegando ChambaPE API en el servidor..."

# Variables
PROJECT_NAME="chambape-api"
DOCKER_IMAGE_NAME="chambape-api"
DOCKER_TAG="latest"
APP_DIR="/opt/chambape-api"

cd $APP_DIR

# Cargar imagen Docker
echo "📦 Cargando imagen Docker..."
docker load < "$DOCKER_IMAGE_NAME.tar.gz"

# Detener contenedor existente si existe
echo "🛑 Deteniendo contenedor existente..."
docker stop $PROJECT_NAME 2>/dev/null || true
docker rm $PROJECT_NAME 2>/dev/null || true

# Crear red Docker si no existe
docker network create chambape-network 2>/dev/null || true

# Ejecutar contenedor
echo "▶️  Iniciando contenedor..."
docker run -d \
    --name $PROJECT_NAME \
    --network chambape-network \
    --restart unless-stopped \
    -p 3000:3000 \
    --env-file .env \
    -v /var/log/chambape-api:/app/logs \
    $DOCKER_IMAGE_NAME:$DOCKER_TAG

# Verificar que el contenedor esté ejecutándose
echo "🔍 Verificando estado del contenedor..."
sleep 5
if docker ps | grep -q $PROJECT_NAME; then
    echo "✅ Contenedor ejecutándose correctamente"
    echo "📊 Logs del contenedor:"
    docker logs --tail 20 $PROJECT_NAME
else
    echo "❌ Error: El contenedor no se inició correctamente"
    docker logs $PROJECT_NAME
    exit 1
fi

# Verificar que la API responda
echo "🔍 Verificando que la API responda..."
sleep 10
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ API respondiendo correctamente"
else
    echo "⚠️  La API no responde aún, revisa los logs:"
    docker logs --tail 50 $PROJECT_NAME
fi

echo "🎉 Despliegue completado exitosamente!"
EOF

    # Transferir script al servidor
    scp -i "$EC2_KEY" -o StrictHostKeyChecking=no deploy-server.sh ubuntu@$EC2_IP:/opt/chambape-api/
    
    # Dar permisos de ejecución
    ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no ubuntu@$EC2_IP "chmod +x /opt/chambape-api/deploy-server.sh"
    
    print_status "✅ Script de despliegue creado en el servidor"
}

# Ejecutar despliegue en el servidor
deploy_on_server() {
    print_step "Ejecutando despliegue en el servidor..."
    
    ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no ubuntu@$EC2_IP "cd /opt/chambape-api && ./deploy-server.sh"
    
    print_status "✅ Despliegue completado en el servidor"
}

# Verificar despliegue
verify_deployment() {
    print_step "Verificando despliegue..."
    
    # Verificar que la API responda
    if curl -f http://$EC2_IP/health > /dev/null 2>&1; then
        print_status "✅ API respondiendo correctamente en http://$EC2_IP"
    else
        print_warning "⚠️  La API no responde aún, puede tardar unos minutos"
        print_warning "Verifica los logs: ssh -i $EC2_KEY ubuntu@$EC2_IP 'docker logs chambape-api'"
    fi
    
    # Mostrar información del despliegue
    echo ""
    echo "🎉 Despliegue completado!"
    echo ""
    echo "📋 Información del despliegue:"
    echo "   URL de la API: http://$EC2_IP"
    echo "   Health check: http://$EC2_IP/health"
    echo "   Documentación: http://$EC2_IP/api/docs"
    echo ""
    echo "🔧 Comandos útiles:"
    echo "   Ver logs: ssh -i $EC2_KEY ubuntu@$EC2_IP 'docker logs -f chambape-api'"
    echo "   Reiniciar: ssh -i $EC2_KEY ubuntu@$EC2_IP 'docker restart chambape-api'"
    echo "   Ver estado: ssh -i $EC2_KEY ubuntu@$EC2_IP 'docker ps'"
    echo ""
}

# Limpiar archivos temporales
cleanup() {
    print_step "Limpiando archivos temporales..."
    
    rm -f "$DOCKER_IMAGE_NAME.tar.gz"
    rm -f deploy-server.sh
    
    print_status "✅ Limpieza completada"
}

# Función principal
main() {
    echo "🚀 Iniciando despliegue de ChambaPE API en AWS..."
    echo ""
    
    check_dependencies
    get_ec2_ip
    build_docker_image
    save_docker_image
    transfer_files
    create_deploy_script
    deploy_on_server
    verify_deployment
    cleanup
    
    echo ""
    print_status "🎉 ¡Despliegue completado exitosamente!"
}

# Ejecutar función principal
main "$@" 