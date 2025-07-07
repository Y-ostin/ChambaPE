#!/bin/bash
# ===============================
# ChambaPE - Setup Script for EC2
# ===============================

set -e

echo "🚀 Configurando servidor EC2 para ChambaPE..."

# Actualizar sistema
echo "📦 Actualizando sistema..."
sudo yum update -y

# Instalar Docker
echo "🐳 Instalando Docker..."
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Instalar Docker Compose
echo "🔧 Instalando Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Instalar Node.js 18
echo "📦 Instalando Node.js 18..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Instalar PM2 (Process Manager)
echo "⚙️ Instalando PM2..."
sudo npm install -g pm2

# Instalar nginx (reverse proxy)
echo "🌐 Instalando Nginx..."
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configurar firewall
echo "🔒 Configurando firewall..."
sudo yum install -y firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# Crear directorio para la aplicación
echo "📁 Creando directorios..."
mkdir -p /home/ec2-user/chambape
mkdir -p /home/ec2-user/chambape/logs
mkdir -p /home/ec2-user/chambape/uploads

# Configurar Nginx como reverse proxy
echo "🔧 Configurando Nginx..."
sudo tee /etc/nginx/conf.d/chambape.conf > /dev/null <<EOF
upstream chambape_backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name _;
    client_max_body_size 50M;

    # Logs
    access_log /var/log/nginx/chambape.access.log;
    error_log /var/log/nginx/chambape.error.log;

    # API Routes
    location /api {
        proxy_pass http://chambape_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check
    location /health {
        proxy_pass http://chambape_backend;
        access_log off;
    }

    # Static files (si hay)
    location /static/ {
        alias /home/ec2-user/chambape/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Default fallback
    location / {
        proxy_pass http://chambape_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Reiniciar nginx
sudo systemctl restart nginx

# Instalar certbot para SSL (opcional)
echo "🔐 Instalando Certbot para SSL..."
sudo yum install -y certbot python3-certbot-nginx

# Crear script de deploy
echo "📝 Creando script de deploy..."
tee /home/ec2-user/deploy-app.sh > /dev/null <<'EOF'
#!/bin/bash
set -e

echo "🚀 Desplegando ChambaPE..."

# Ir al directorio de la aplicación
cd /home/ec2-user/chambape

# Detener aplicación actual
echo "⏹️ Deteniendo aplicación..."
pm2 delete chambape-api 2>/dev/null || true

# Backup de .env actual
if [ -f .env.production ]; then
    cp .env.production .env.production.backup
fi

# Instalar/actualizar dependencias
echo "📦 Instalando dependencias..."
npm install --production

# Build de la aplicación
echo "🔨 Compilando aplicación..."
npm run build

# Ejecutar migraciones (si las hay)
echo "🗄️ Ejecutando migraciones..."
npm run migration:run 2>/dev/null || echo "No hay migraciones que ejecutar"

# Iniciar aplicación
echo "▶️ Iniciando aplicación..."
pm2 start dist/main.js --name chambape-api --env production

# Configurar PM2 para inicio automático
pm2 save
pm2 startup

echo "✅ Deploy completado!"
echo "📍 URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
EOF

chmod +x /home/ec2-user/deploy-app.sh

# Crear script de logs
echo "📊 Creando script de logs..."
tee /home/ec2-user/logs.sh > /dev/null <<'EOF'
#!/bin/bash

echo "📊 ChambaPE - Logs del Sistema"
echo "================================"

case "${1:-all}" in
    "app")
        echo "📱 Logs de la aplicación:"
        pm2 logs chambape-api --lines 50
        ;;
    "nginx")
        echo "🌐 Logs de Nginx:"
        sudo tail -f /var/log/nginx/chambape.access.log
        ;;
    "error")
        echo "❌ Logs de errores:"
        sudo tail -f /var/log/nginx/chambape.error.log
        ;;
    "system")
        echo "🖥️ Logs del sistema:"
        sudo journalctl -u nginx -f
        ;;
    "all"|*)
        echo "📱 Últimos logs de la aplicación:"
        pm2 logs chambape-api --lines 20
        echo ""
        echo "🌐 Últimos logs de Nginx:"
        sudo tail -20 /var/log/nginx/chambape.access.log
        ;;
esac
EOF

chmod +x /home/ec2-user/logs.sh

# Crear script de monitoreo
tee /home/ec2-user/monitor.sh > /dev/null <<'EOF'
#!/bin/bash

echo "📈 ChambaPE - Monitor del Sistema"
echo "================================"

# Estado de la aplicación
echo "📱 Estado de la aplicación:"
pm2 status

echo ""
echo "🌐 Estado de Nginx:"
sudo systemctl status nginx --no-pager

echo ""
echo "💾 Uso de disco:"
df -h

echo ""
echo "🧠 Uso de memoria:"
free -h

echo ""
echo "⚡ Procesos top:"
top -b -n 1 | head -20

echo ""
echo "🔍 Conexiones activas:"
netstat -tuln | grep -E ':(80|443|3000)'
EOF

chmod +x /home/ec2-user/monitor.sh

# Permisos para ec2-user
sudo chown -R ec2-user:ec2-user /home/ec2-user/chambape
sudo usermod -a -G nginx ec2-user

# Crear cron job para backup automático
echo "⏰ Configurando backup automático..."
(crontab -l 2>/dev/null || echo "") | grep -v "chambape-backup" | {
    cat
    echo "0 2 * * * /home/ec2-user/chambape/backup.sh"
} | crontab -

echo "✅ Configuración del servidor completada!"
echo ""
echo "📋 Comandos útiles:"
echo "  🚀 Desplegar: ./deploy-app.sh"
echo "  📊 Ver logs: ./logs.sh"
echo "  📈 Monitor: ./monitor.sh"
echo "  🔧 PM2: pm2 status|logs|restart"
echo "  🌐 Nginx: sudo systemctl status nginx"
echo ""
echo "🔗 Siguiente paso: Copiar código y ejecutar deploy-app.sh"
