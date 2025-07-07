# ChambaPE - Deploy NestJS Backend en EC2
param(
    [string]$Action = "help"
)

# Configuracion
$REGION = "us-east-2"
$PROJECT_NAME = "chambape"
$KEY_PAIR_NAME = "chambape-keypair"
$INSTANCE_TAG = "chambape-server"

# Funciones de utilidad
function Write-Info($message) { 
    Write-Host "[INFO] $message" -ForegroundColor Blue 
}

function Write-Success($message) { 
    Write-Host "[OK] $message" -ForegroundColor Green 
}

function Write-Warning($message) { 
    Write-Host "[ADVERTENCIA] $message" -ForegroundColor Yellow 
}

function Write-ErrorMsg($message) { 
    Write-Host "[ERROR] $message" -ForegroundColor Red 
}

# Mostrar ayuda
if ($Action -eq "help") {
    Write-Host "ChambaPE - Deploy NestJS Backend en EC2" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso: .\deploy-nestjs-ec2.ps1 -Action [accion]"
    Write-Host ""
    Write-Host "Acciones disponibles:"
    Write-Host "  check       - Verificar EC2 y prerequisitos"
    Write-Host "  setup       - Instalar Node.js y dependencias"
    Write-Host "  deploy      - Subir y desplegar la aplicacion"
    Write-Host "  start       - Iniciar la aplicacion NestJS"
    Write-Host "  status      - Ver estado de la aplicacion"
    Write-Host "  logs        - Ver logs de la aplicacion"
    Write-Host "  restart     - Reiniciar la aplicacion"
    Write-Host "  full        - Setup completo + deploy + start"
    Write-Host "  help        - Mostrar esta ayuda"
    Write-Host ""
    Write-Host "Ejemplo: .\deploy-nestjs-ec2.ps1 -Action full"
    exit 0
}

# Obtener informacion de la instancia EC2
function Get-EC2Instance {
    $instance = aws ec2 describe-instances --filters "Name=tag:Name,Values=$INSTANCE_TAG" "Name=instance-state-name,Values=running" --region $REGION --query "Reservations[0].Instances[0].[InstanceId,PublicIpAddress]" --output text 2>$null
    
    if ($instance -and $instance -ne "None") {
        $instanceData = $instance -split "`t"
        return @{
            InstanceId = $instanceData[0]
            PublicIp = $instanceData[1]
        }
    }
    return $null
}

# Verificar prerequisitos
Write-Info "Verificando prerequisitos..."

# Verificar AWS CLI
try {
    $awsVersion = aws --version 2>$null
    Write-Success "AWS CLI: $awsVersion"
} catch {
    Write-ErrorMsg "AWS CLI no esta instalado"
    exit 1
}

# Verificar conexion AWS
try {
    $identity = aws sts get-caller-identity | ConvertFrom-Json
    Write-Success "Conectado a AWS como: $($identity.Arn)"
    $global:accountId = $identity.Account
} catch {
    Write-ErrorMsg "No se puede conectar a AWS. Verifica tus credenciales."
    exit 1
}

# Ejecutar accion solicitada
switch ($Action) {
    "check" {
        Write-Info "Verificando instancia EC2..."
        
        $ec2 = Get-EC2Instance
        if ($ec2) {
            Write-Success "Instancia EC2 encontrada: $($ec2.InstanceId)"
            Write-Success "IP publica: $($ec2.PublicIp)"
            Write-Info "URL actual: http://$($ec2.PublicIp)"
            
            # Verificar si el archivo .pem existe
            if (Test-Path "$KEY_PAIR_NAME.pem") {
                Write-Success "Key pair encontrado: $KEY_PAIR_NAME.pem"
            } else {
                Write-Warning "Key pair no encontrado. Necesitas $KEY_PAIR_NAME.pem para conectarte via SSH"
                Write-Info "Puedes conectarte via AWS Session Manager como alternativa"
            }
        } else {
            Write-ErrorMsg "No se encontro instancia EC2 corriendo con tag: $INSTANCE_TAG"
            Write-Info "Ejecuta primero: .\deploy-basic-aws.ps1 -Action create"
            exit 1
        }
    }
    
    "setup" {
        Write-Info "Configurando EC2 para NestJS..."
        
        $ec2 = Get-EC2Instance
        if (-not $ec2) {
            Write-ErrorMsg "No se encontro instancia EC2"
            exit 1
        }
        
        Write-Info "Preparando script de instalacion..."
        
        # Crear script de instalacion
        $setupScript = @"
#!/bin/bash
echo "=== ChambaPE - Instalando Node.js y dependencias ==="

# Actualizar sistema
sudo yum update -y

# Instalar Node.js 20.x (LTS)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verificar instalacion
echo "Node.js version: `$(node --version)"
echo "NPM version: `$(npm --version)"

# Instalar PM2 para gestion de procesos
sudo npm install -g pm2

# Instalar Git
sudo yum install -y git

# Crear directorio para la aplicacion
sudo mkdir -p /opt/chambape
sudo chown ec2-user:ec2-user /opt/chambape

# Instalar PostgreSQL client (para conectar a RDS si es necesario)
sudo yum install -y postgresql15

echo "=== Instalacion completada ==="
"@
        
        # Guardar script localmente
        $setupScript | Out-File -FilePath "setup-ec2.sh" -Encoding UTF8
        
        # Subir script a EC2 via S3
        $bucketName = (aws s3 ls | Select-String "$PROJECT_NAME-files" | ForEach-Object { ($_ -split '\s+')[2] })
        if ($bucketName) {
            Write-Info "Subiendo script de instalacion a S3..."
            aws s3 cp "setup-ec2.sh" "s3://$bucketName/"
            
            # Ejecutar script en EC2
            Write-Info "Ejecutando instalacion en EC2..."
            $command = "aws s3 cp s3://$bucketName/setup-ec2.sh /tmp/ && chmod +x /tmp/setup-ec2.sh && /tmp/setup-ec2.sh"
            
            aws ssm send-command --instance-ids $ec2.InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[$command]" --region $REGION --output table
            
            Write-Success "Script de instalacion enviado a EC2"
            Write-Info "La instalacion puede tardar 2-3 minutos"
            Write-Info "Ejecuta: .\deploy-nestjs-ec2.ps1 -Action status para verificar"
        } else {
            Write-ErrorMsg "No se encontro bucket S3"
        }
        
        # Limpiar archivo local
        Remove-Item "setup-ec2.sh" -Force
    }
    
    "deploy" {
        Write-Info "Desplegando aplicacion NestJS..."
        
        $ec2 = Get-EC2Instance
        if (-not $ec2) {
            Write-ErrorMsg "No se encontro instancia EC2"
            exit 1
        }
        
        # Crear archivo tar con el codigo fuente
        Write-Info "Empaquetando aplicacion..."
        
        # Crear .env para produccion
        $envContent = @"
NODE_ENV=production
PORT=3000
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=chambape
DATABASE_PASSWORD=ChambaPE2025!
DATABASE_NAME=chambape_db
DATABASE_SYNCHRONIZE=false
DATABASE_MAX_CONNECTIONS=100
DATABASE_SSL_ENABLED=false
DATABASE_REJECT_UNAUTHORIZED=false
DATABASE_CA=
DATABASE_KEY=
DATABASE_CERT=

AWS_S3_REGION=$REGION
AWS_S3_ACCESS_KEY_ID=
AWS_S3_SECRET_ACCESS_KEY=
AWS_DEFAULT_S3_BUCKET=$PROJECT_NAME-files-6427

FILE_DRIVER=s3
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=3650d
FRONTEND_DOMAIN=http://$($ec2.PublicIp)
BACKEND_DOMAIN=http://$($ec2.PublicIp):3000

MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USER=
MAIL_PASSWORD=
MAIL_IGNORE_TLS=true
MAIL_SECURE=false
MAIL_REQUIRE_TLS=false
MAIL_DEFAULT_EMAIL=noreply@example.com
MAIL_DEFAULT_NAME=Api
MAIL_CLIENT_PORT=1080

APPLE_APP_AUDIENCE=[]
APPLE_APP_ID=[]

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=

WORKERS_HOST=redis://localhost:6379/1
"@
        
        $envContent | Out-File -FilePath ".env.production" -Encoding UTF8
        
        # Crear script de deploy
        $deployScript = @"
#!/bin/bash
echo "=== ChambaPE - Desplegando aplicacion ==="

cd /opt/chambape

# Clonar o actualizar repositorio
if [ -d ".git" ]; then
    echo "Actualizando codigo..."
    git pull origin main || git pull origin master
else
    echo "Clonando repositorio..."
    # Como no podemos clonar desde local, copiaremos los archivos
    echo "Preparando directorio para recibir archivos..."
fi

# Instalar dependencias
echo "Instalando dependencias..."
npm install --only=production

# Construir aplicacion
echo "Construyendo aplicacion..."
npm run build

# Configurar PM2
echo "Configurando PM2..."
pm2 delete chambape-api 2>/dev/null || true
pm2 start dist/main.js --name "chambape-api" --env production

# Configurar PM2 para reinicio automatico
pm2 save
pm2 startup

echo "=== Deploy completado ==="
pm2 status
"@
        
        $deployScript | Out-File -FilePath "deploy-app.sh" -Encoding UTF8
        
        # Subir archivos a S3
        $bucketName = (aws s3 ls | Select-String "$PROJECT_NAME-files" | ForEach-Object { ($_ -split '\s+')[2] })
        if ($bucketName) {
            Write-Info "Subiendo archivos de la aplicacion..."
            
            # Subir archivos esenciales
            aws s3 cp ".env.production" "s3://$bucketName/"
            aws s3 cp "deploy-app.sh" "s3://$bucketName/"
            aws s3 cp "package.json" "s3://$bucketName/"
            aws s3 cp "package-lock.json" "s3://$bucketName/" 2>$null
            
            # Subir codigo fuente
            aws s3 sync "src/" "s3://$bucketName/src/" --exclude "*.log"
            aws s3 sync "." "s3://$bucketName/" --exclude "node_modules/*" --exclude "dist/*" --exclude ".git/*" --exclude "*.log"
            
            Write-Success "Archivos subidos a S3"
            
            # Ejecutar deploy en EC2
            $command = @"
aws s3 sync s3://$bucketName/ /opt/chambape/ --exclude 'test-file.txt' && 
cd /opt/chambape && 
chmod +x deploy-app.sh && 
./deploy-app.sh
"@
            
            Write-Info "Ejecutando deploy en EC2..."
            aws ssm send-command --instance-ids $ec2.InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[$command]" --region $REGION --output table
            
            Write-Success "Deploy iniciado en EC2"
            Write-Info "El proceso puede tardar 3-5 minutos"
        }
        
        # Limpiar archivos temporales
        Remove-Item ".env.production" -Force
        Remove-Item "deploy-app.sh" -Force
    }
    
    "start" {
        Write-Info "Iniciando aplicacion NestJS..."
        
        $ec2 = Get-EC2Instance
        if (-not $ec2) {
            Write-ErrorMsg "No se encontro instancia EC2"
            exit 1
        }
        
        $command = "cd /opt/chambape && pm2 start dist/main.js --name 'chambape-api' || pm2 restart chambape-api"
        
        aws ssm send-command --instance-ids $ec2.InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[$command]" --region $REGION --output table
        
        Write-Success "Comando de inicio enviado"
        Write-Info "La aplicacion estara disponible en: http://$($ec2.PublicIp):3000"
        Write-Info "API Docs: http://$($ec2.PublicIp):3000/docs"
    }
    
    "status" {
        Write-Info "Verificando estado de la aplicacion..."
        
        $ec2 = Get-EC2Instance
        if (-not $ec2) {
            Write-ErrorMsg "No se encontro instancia EC2"
            exit 1
        }
        
        Write-Info "Instancia EC2: $($ec2.InstanceId)"
        Write-Info "IP publica: $($ec2.PublicIp)"
        Write-Info "URL de la aplicacion: http://$($ec2.PublicIp):3000"
        Write-Info "API Docs: http://$($ec2.PublicIp):3000/docs"
        
        # Verificar estado via SSM
        $command = "cd /opt/chambape && pm2 status && echo '---' && curl -s http://localhost:3000/health || echo 'App no disponible aun'"
        
        aws ssm send-command --instance-ids $ec2.InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[$command]" --region $REGION --output table
        
        Write-Info "Comando de estado enviado. Revisa AWS Console para ver el resultado."
    }
    
    "logs" {
        $ec2 = Get-EC2Instance
        if (-not $ec2) {
            Write-ErrorMsg "No se encontro instancia EC2"
            exit 1
        }
        
        $command = "cd /opt/chambape && pm2 logs chambape-api --lines 50"
        
        aws ssm send-command --instance-ids $ec2.InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[$command]" --region $REGION --output table
        
        Write-Info "Comando de logs enviado. Revisa AWS Console para ver los logs."
    }
    
    "restart" {
        $ec2 = Get-EC2Instance
        if (-not $ec2) {
            Write-ErrorMsg "No se encontro instancia EC2"
            exit 1
        }
        
        $command = "cd /opt/chambape && pm2 restart chambape-api"
        
        aws ssm send-command --instance-ids $ec2.InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[$command]" --region $REGION --output table
        
        Write-Success "Comando de reinicio enviado"
    }
    
    "manual" {
        Write-Info "Preparando archivos para instalacion manual..."
        
        $ec2 = Get-EC2Instance
        if (-not $ec2) {
            Write-ErrorMsg "No se encontro instancia EC2"
            exit 1
        }
        
        # Crear script completo de instalacion y deploy
        $fullScript = @"
#!/bin/bash
echo "=== ChambaPE - Instalacion y Deploy Completo ==="

# Actualizar sistema
sudo yum update -y

# Instalar Node.js 20.x (LTS)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verificar instalacion
echo "Node.js version: `$(node --version)"
echo "NPM version: `$(npm --version)"

# Instalar PM2 para gestion de procesos
sudo npm install -g pm2

# Instalar Git
sudo yum install -y git

# Crear directorio para la aplicacion
sudo mkdir -p /opt/chambape
sudo chown ec2-user:ec2-user /opt/chambape

# Ir al directorio de la aplicacion
cd /opt/chambape

# Descargar archivos desde S3
aws s3 sync s3://$PROJECT_NAME-files-6427/ /opt/chambape/ --exclude 'test-file.txt'

# Instalar dependencias
echo "Instalando dependencias..."
npm install --only=production

# Construir aplicacion
echo "Construyendo aplicacion..."
npm run build

# Configurar PM2
echo "Configurando PM2..."
pm2 delete chambape-api 2>/dev/null || true
pm2 start dist/main.js --name "chambape-api" --env production

# Configurar PM2 para reinicio automatico
pm2 save
pm2 startup

echo "=== Instalacion y Deploy Completado ==="
pm2 status
echo "Aplicacion disponible en: http://localhost:3000"
"@
        
        # Crear .env para produccion
        $envContent = @"
NODE_ENV=production
PORT=3000
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=chambape
DATABASE_PASSWORD=ChambaPE2025!
DATABASE_NAME=chambape_db
DATABASE_SYNCHRONIZE=false
DATABASE_MAX_CONNECTIONS=100
DATABASE_SSL_ENABLED=false
DATABASE_REJECT_UNAUTHORIZED=false
DATABASE_CA=
DATABASE_KEY=
DATABASE_CERT=

AWS_S3_REGION=$REGION
AWS_S3_ACCESS_KEY_ID=
AWS_S3_SECRET_ACCESS_KEY=
AWS_DEFAULT_S3_BUCKET=$PROJECT_NAME-files-6427

FILE_DRIVER=s3
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=3650d
FRONTEND_DOMAIN=http://$($ec2.PublicIp)
BACKEND_DOMAIN=http://$($ec2.PublicIp):3000

MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USER=
MAIL_PASSWORD=
MAIL_IGNORE_TLS=true
MAIL_SECURE=false
MAIL_REQUIRE_TLS=false
MAIL_DEFAULT_EMAIL=noreply@example.com
MAIL_DEFAULT_NAME=Api
MAIL_CLIENT_PORT=1080

APPLE_APP_AUDIENCE=[]
APPLE_APP_ID=[]

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=

WORKERS_HOST=redis://localhost:6379/1
"@
        
        # Guardar archivos
        $fullScript | Out-File -FilePath "install-and-deploy.sh" -Encoding UTF8
        $envContent | Out-File -FilePath ".env.production" -Encoding UTF8
        
        # Subir todos los archivos a S3
        $bucketName = (aws s3 ls | Select-String "$PROJECT_NAME-files" | ForEach-Object { ($_ -split '\s+')[2] })
        if ($bucketName) {
            Write-Info "Subiendo archivos de la aplicacion a S3..."
            
            # Subir script principal
            aws s3 cp "install-and-deploy.sh" "s3://$bucketName/"
            aws s3 cp ".env.production" "s3://$bucketName/"
            
            # Subir archivos del proyecto
            aws s3 cp "package.json" "s3://$bucketName/"
            aws s3 cp "package-lock.json" "s3://$bucketName/" 2>$null
            aws s3 cp "tsconfig.json" "s3://$bucketName/" 2>$null
            aws s3 cp "nest-cli.json" "s3://$bucketName/" 2>$null
            
            # Subir codigo fuente
            aws s3 sync "src/" "s3://$bucketName/src/" --exclude "*.log"
            aws s3 sync "." "s3://$bucketName/" --exclude "node_modules/*" --exclude "dist/*" --exclude ".git/*" --exclude "*.log" --exclude "*.ps1" --exclude "*.md"
            
            Write-Success "Todos los archivos subidos a S3: $bucketName"
            
            Write-Host "`n=== INSTRUCCIONES PARA CONECTARTE A LA EC2 ===" -ForegroundColor Yellow
            Write-Host "1. Ve a la consola de AWS EC2" -ForegroundColor White
            Write-Host "2. Selecciona la instancia: $($ec2.InstanceId)" -ForegroundColor White
            Write-Host "3. Haz clic en 'Connect' -> 'Session Manager'" -ForegroundColor White
            Write-Host "4. Una vez conectado, ejecuta estos comandos:" -ForegroundColor White
            Write-Host ""
            Write-Host "   cd /tmp" -ForegroundColor Green
            Write-Host "   aws s3 cp s3://$bucketName/install-and-deploy.sh ." -ForegroundColor Green
            Write-Host "   chmod +x install-and-deploy.sh" -ForegroundColor Green
            Write-Host "   ./install-and-deploy.sh" -ForegroundColor Green
            Write-Host ""
            Write-Host "5. Espera 5-10 minutos para que se complete la instalacion" -ForegroundColor White
            Write-Host "6. La aplicacion estara disponible en:" -ForegroundColor White
            Write-Host "   http://$($ec2.PublicIp):3000" -ForegroundColor Cyan
            Write-Host "   http://$($ec2.PublicIp):3000/docs" -ForegroundColor Cyan
            Write-Host ""
        }
        
        # Limpiar archivos temporales
        Remove-Item "install-and-deploy.sh" -Force
        Remove-Item ".env.production" -Force
    }

    "full" {
        Write-Info "Ejecutando deploy completo de NestJS..."
        
        # Setup
        Write-Host "`n=== PASO 1: SETUP ===" -ForegroundColor Cyan
        & $MyInvocation.MyCommand.Path -Action setup
        
        Write-Info "Esperando 3 minutos para que se complete la instalacion..."
        Start-Sleep -Seconds 180
        
        # Deploy
        Write-Host "`n=== PASO 2: DEPLOY ===" -ForegroundColor Cyan
        & $MyInvocation.MyCommand.Path -Action deploy
        
        Write-Info "Esperando 2 minutos para que se complete el deploy..."
        Start-Sleep -Seconds 120
        
        # Start
        Write-Host "`n=== PASO 3: START ===" -ForegroundColor Cyan
        & $MyInvocation.MyCommand.Path -Action start
        
        Write-Success "Deploy completo finalizado!"
        
        $ec2 = Get-EC2Instance
        if ($ec2) {
            Write-Host "`n=== APLICACION DESPLEGADA ===" -ForegroundColor Green
            Write-Success "URL de la aplicacion: http://$($ec2.PublicIp):3000"
            Write-Success "API Docs: http://$($ec2.PublicIp):3000/docs"
            Write-Success "Health Check: http://$($ec2.PublicIp):3000/health"
            Write-Info "Nota: La aplicacion puede tardar 1-2 minutos adicionales en estar disponible"
        }
    }
    
    default {
        Write-ErrorMsg "Accion desconocida: $Action"
        Write-Info "Usa -Action help para ver las opciones disponibles"
        exit 1
    }
}

Write-Success "Operacion '$Action' completada"
