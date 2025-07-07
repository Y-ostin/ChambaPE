#!/bin/bash

# Script para configurar el servidor EC2
set -e

echo "🚀 Configurando servidor EC2 para ChambaPE..."

# Actualizar sistema
sudo yum update -y

# Instalar Docker
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Instalar AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Crear directorio para la aplicación
mkdir -p /opt/chambape-api
cd /opt/chambape-api

# Descargar archivos desde S3
aws s3 cp s3://chambape-uploads-1720257219/chambape-api.tar.gz .
aws s3 cp s3://chambape-uploads-1720257219/.env.production .

# Cargar imagen Docker
gunzip -c chambape-api.tar.gz | sudo docker load

# Ejecutar contenedor
sudo docker run -d \
    --name chambape-api \
    --restart unless-stopped \
    -p 3000:3000 \
    --env-file .env.production \
    chambape-api

# Instalar Nginx
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configurar Nginx como proxy reverso
sudo tee /etc/nginx/conf.d/chambape-api.conf > /dev/null << 'EOF'
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
EOF

# Reiniciar Nginx
sudo systemctl restart nginx

# Configurar firewall
sudo yum install -y firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload

echo "✅ Servidor configurado exitosamente!"
echo "🌐 API disponible en: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "📚 Swagger disponible en: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)/docs" 