# ===============================
# ChambaPE - Deploy EC2 + S3 + RDS
# ===============================

param(
    [string]$Action = "help",
    [string]$InstanceType = "t3.small",
    [string]$Region = "us-east-1"
)

# Configuración
$PROJECT_NAME = "chambape"
$KEY_PAIR_NAME = "chambape-key"
$SECURITY_GROUP_NAME = "chambape-sg"
$S3_BUCKET_NAME = "chambape-storage-prod"
$RDS_INSTANCE_ID = "chambape-db"

# Colores para output
function Write-Info($message) { Write-Host "[INFO] $message" -ForegroundColor Blue }
function Write-Success($message) { Write-Host "[✓] $message" -ForegroundColor Green }
function Write-Warning($message) { Write-Host "[⚠] $message" -ForegroundColor Yellow }
function Write-ErrorMsg($message) { Write-Host "[✗] $message" -ForegroundColor Red }

# ===============================
# FUNCIÓN: Mostrar ayuda
# ===============================
function Show-Help {
    Write-Host @"
🚀 ChambaPE - Deploy EC2 + S3 + RDS

COMANDOS DISPONIBLES:
  .\deploy-ec2-stack.ps1 -Action setup      # Configuración inicial AWS
  .\deploy-ec2-stack.ps1 -Action create     # Crear toda la infraestructura
  .\deploy-ec2-stack.ps1 -Action deploy     # Desplegar aplicación en EC2
  .\deploy-ec2-stack.ps1 -Action status     # Ver estado de recursos
  .\deploy-ec2-stack.ps1 -Action cleanup    # Limpiar recursos

SERVICIOS AWS QUE SE CREARÁN:
  🖥️  EC2 Instance ($InstanceType)
  🗄️  RDS PostgreSQL (db.t3.micro) 
  📦  S3 Bucket para archivos
  🔒  Security Groups
  🔑  Key Pair para SSH

COSTO ESTIMADO MENSUAL: ~\$25-50 USD

REQUISITOS:
  - AWS CLI instalado y configurado
  - Docker instalado
  - Cuenta AWS con permisos necesarios

"@
}

# ===============================
# FUNCIÓN: Verificar requisitos
# ===============================
function Test-Prerequisites {
    Write-Info "Verificando requisitos..."
    
    # AWS CLI
    try {
        $awsVersion = aws --version 2>$null
        Write-Success "AWS CLI: $awsVersion"
    } catch {
        Write-ErrorMsg "AWS CLI no encontrado. Instalar desde: https://aws.amazon.com/cli/"
        return $false
    }
    
    # Docker
    try {
        $dockerVersion = docker --version 2>$null
        Write-Success "Docker: $dockerVersion"
    } catch {
        Write-ErrorMsg "Docker no encontrado. Instalar desde: https://docker.com"
        return $false
    }
    
    # Verificar credenciales AWS
    try {
        $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
        Write-Success "AWS Identity: $($identity.UserId)"
        return $true
    } catch {
        Write-ErrorMsg "Credenciales AWS no configuradas. Ejecutar: aws configure"
        return $false
    }
}

# ===============================
# FUNCIÓN: Crear Key Pair
# ===============================
function New-KeyPair {
    Write-Info "Creando Key Pair..."
    
    try {
        # Verificar si ya existe
        aws ec2 describe-key-pairs --key-names $KEY_PAIR_NAME --region $Region 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Warning "Key Pair '$KEY_PAIR_NAME' ya existe"
            return
        }
        
        # Crear nuevo key pair
        $keyMaterial = aws ec2 create-key-pair --key-name $KEY_PAIR_NAME --region $Region --query 'KeyMaterial' --output text
        $keyMaterial | Out-File -FilePath "$KEY_PAIR_NAME.pem" -Encoding ASCII
        
        Write-Success "Key Pair creado: $KEY_PAIR_NAME.pem"
        Write-Warning "¡IMPORTANTE! Guarda el archivo $KEY_PAIR_NAME.pem en lugar seguro"
        
    } catch {
        Write-ErrorMsg "Error creando Key Pair: $_"
    }
}

# ===============================
# FUNCIÓN: Crear Security Group
# ===============================
function New-SecurityGroup {
    Write-Info "Creando Security Group..."
    
    try {
        # Verificar si ya existe
        $sgExists = aws ec2 describe-security-groups --group-names $SECURITY_GROUP_NAME --region $Region 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Warning "Security Group '$SECURITY_GROUP_NAME' ya existe"
            return
        }
        
        # Crear security group
        $groupId = aws ec2 create-security-group --group-name $SECURITY_GROUP_NAME --description "ChambaPE Security Group" --region $Region --query 'GroupId' --output text
        
        # Reglas de entrada
        aws ec2 authorize-security-group-ingress --group-id $groupId --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $Region     # SSH
        aws ec2 authorize-security-group-ingress --group-id $groupId --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $Region     # HTTP
        aws ec2 authorize-security-group-ingress --group-id $groupId --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $Region    # HTTPS
        aws ec2 authorize-security-group-ingress --group-id $groupId --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region $Region   # API
        
        Write-Success "Security Group creado: $groupId"
        
    } catch {
        Write-ErrorMsg "Error creando Security Group: $_"
    }
}

# ===============================
# FUNCIÓN: Crear S3 Bucket
# ===============================
function New-S3Bucket {
    Write-Info "Creando S3 Bucket..."
    
    try {
        # Verificar si ya existe
        aws s3api head-bucket --bucket $S3_BUCKET_NAME --region $Region 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Warning "S3 Bucket '$S3_BUCKET_NAME' ya existe"
            return
        }
        
        # Crear bucket
        if ($Region -eq "us-east-1") {
            aws s3api create-bucket --bucket $S3_BUCKET_NAME --region $Region
        } else {
            aws s3api create-bucket --bucket $S3_BUCKET_NAME --region $Region --create-bucket-configuration LocationConstraint=$Region
        }
        
        # Configurar política de acceso público (bloquear por defecto)
        aws s3api put-public-access-block --bucket $S3_BUCKET_NAME --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
        
        Write-Success "S3 Bucket creado: $S3_BUCKET_NAME"
        
    } catch {
        Write-ErrorMsg "Error creando S3 Bucket: $_"
    }
}

# ===============================
# FUNCIÓN: Crear RDS Instance
# ===============================
function New-RDSInstance {
    Write-Info "Creando RDS PostgreSQL Instance..."
    
    try {
        # Verificar si ya existe
        aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE_ID --region $Region 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Warning "RDS Instance '$RDS_INSTANCE_ID' ya existe"
            return
        }
        
        # Crear subnet group (necesario para RDS)
        $subnetGroup = "$PROJECT_NAME-subnet-group"
        
        # Obtener subnets por defecto
        $subnets = aws ec2 describe-subnets --region $Region --query 'Subnets[?DefaultForAz==`true`].SubnetId' --output text
        $subnetArray = $subnets -split "\s+"
        
        if ($subnetArray.Count -ge 2) {
            aws rds create-db-subnet-group --db-subnet-group-name $subnetGroup --db-subnet-group-description "ChambaPE Subnet Group" --subnet-ids $subnetArray[0] $subnetArray[1] --region $Region 2>$null
        }
        
        # Crear RDS instance
        aws rds create-db-instance `
            --db-instance-identifier $RDS_INSTANCE_ID `
            --db-instance-class db.t3.micro `
            --engine postgres `
            --engine-version 15.4 `
            --master-username chambape_user `
            --master-user-password "ChambaPE2024!Secure" `
            --allocated-storage 20 `
            --db-name chambape_production `
            --storage-type gp2 `
            --db-subnet-group-name $subnetGroup `
            --publicly-accessible `
            --region $Region
        
        Write-Success "RDS Instance creándose: $RDS_INSTANCE_ID"
        Write-Info "La creación de RDS puede tomar 10-15 minutos..."
        
    } catch {
        Write-ErrorMsg "Error creando RDS Instance: $_"
    }
}

# ===============================
# FUNCIÓN: Crear EC2 Instance
# ===============================
function New-EC2Instance {
    Write-Info "Creando EC2 Instance..."
    
    try {
        # Obtener AMI más reciente de Amazon Linux 2
        $amiId = aws ec2 describe-images --owners amazon --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" "Name=state,Values=available" --region $Region --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' --output text
        
        # Obtener Security Group ID
        $sgId = aws ec2 describe-security-groups --group-names $SECURITY_GROUP_NAME --region $Region --query 'SecurityGroups[0].GroupId' --output text
        
        # User Data Script para configurar el servidor
        $userData = @"
#!/bin/bash
yum update -y
yum install -y docker git

# Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Instalar Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Iniciar servicios
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Crear directorio para la aplicación
mkdir -p /home/ec2-user/chambape
chown ec2-user:ec2-user /home/ec2-user/chambape

echo "Servidor configurado correctamente" > /var/log/user-data.log
"@
        
        $userDataBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($userData))
        
        # Crear instancia EC2
        $instanceData = aws ec2 run-instances `
            --image-id $amiId `
            --count 1 `
            --instance-type $InstanceType `
            --key-name $KEY_PAIR_NAME `
            --security-group-ids $sgId `
            --user-data $userDataBase64 `
            --region $Region `
            --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$PROJECT_NAME-server},{Key=Project,Value=$PROJECT_NAME}]" `
            --output json | ConvertFrom-Json
        
        $instanceId = $instanceData.Instances[0].InstanceId
        
        Write-Success "EC2 Instance creada: $instanceId"
        Write-Info "Esperando que la instancia esté lista..."
        
        # Esperar hasta que esté running
        aws ec2 wait instance-running --instance-ids $instanceId --region $Region
        
        # Obtener IP pública
        $publicIp = aws ec2 describe-instances --instance-ids $instanceId --region $Region --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
        
        Write-Success "✓ EC2 Instance lista!"
        Write-Success "✓ IP Pública: $publicIp"
        Write-Info "SSH: ssh -i $KEY_PAIR_NAME.pem ec2-user@$publicIp"
        
        # Actualizar .env.production con la IP
        if (Test-Path ".env.production") {
            (Get-Content ".env.production") -replace "BACKEND_DOMAIN=.*", "BACKEND_DOMAIN=http://$publicIp:3000" | Set-Content ".env.production"
            Write-Success "✓ .env.production actualizado con IP: $publicIp"
        }
        
    } catch {
        Write-ErrorMsg "Error creando EC2 Instance: $_"
    }
}

# ===============================
# FUNCIÓN: Desplegar aplicación
# ===============================
function Deploy-Application {
    Write-Info "Desplegando aplicación en EC2..."
    
    try {
        # Obtener IP de la instancia EC2
        $instanceId = aws ec2 describe-instances --filters "Name=tag:Name,Values=$PROJECT_NAME-server" "Name=instance-state-name,Values=running" --region $Region --query 'Reservations[0].Instances[0].InstanceId' --output text
        $publicIp = aws ec2 describe-instances --instance-ids $instanceId --region $Region --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
        
        if ($publicIp -eq "None" -or $publicIp -eq $null) {
            Write-ErrorMsg "No se encontró instancia EC2 activa"
            return
        }
        
        Write-Info "Conectando a EC2: $publicIp"
        
        # Crear el archivo tar con el código
        Write-Info "Creando paquete de aplicación..."
        tar -czf chambape-app.tar.gz --exclude=node_modules --exclude=.git --exclude="*.log" --exclude=dist .
        
        # Copiar archivos al servidor
        Write-Info "Copiando archivos al servidor..."
        scp -i "$KEY_PAIR_NAME.pem" -o StrictHostKeyChecking=no chambape-app.tar.gz ec2-user@${publicIp}:/home/ec2-user/
        scp -i "$KEY_PAIR_NAME.pem" -o StrictHostKeyChecking=no .env.production ec2-user@${publicIp}:/home/ec2-user/.env
        
        # Script de deploy remoto
        $deployScript = @"
#!/bin/bash
cd /home/ec2-user
rm -rf chambape
mkdir chambape
cd chambape
tar -xzf ../chambape-app.tar.gz
cp ../.env .env.production

# Instalar dependencias
npm install --production
npm run build

# Iniciar aplicación
pm2 delete chambape-api 2>/dev/null || true
pm2 start dist/main.js --name chambape-api
pm2 save
pm2 startup

echo "✓ Aplicación desplegada correctamente"
"@
        
        $deployScript | ssh -i "$KEY_PAIR_NAME.pem" -o StrictHostKeyChecking=no ec2-user@$publicIp 'cat > deploy.sh && chmod +x deploy.sh && ./deploy.sh'
        
        Write-Success "✓ Aplicación desplegada!"
        Write-Success "✓ URL: http://$publicIp:3000"
        
        # Limpiar archivo temporal
        Remove-Item chambape-app.tar.gz -ErrorAction SilentlyContinue
        
    } catch {
        Write-ErrorMsg "Error desplegando aplicación: $_"
    }
}

# ===============================
# FUNCIÓN: Ver estado
# ===============================
function Get-Status {
    Write-Info "Estado de recursos AWS..."
    
    # EC2
    $ec2Status = aws ec2 describe-instances --filters "Name=tag:Name,Values=$PROJECT_NAME-server" --region $Region --query 'Reservations[0].Instances[0].{State:State.Name,IP:PublicIpAddress,Type:InstanceType}' --output table 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "🖥️ EC2 Instance:" -ForegroundColor Yellow
        Write-Host $ec2Status
    }
    
    # RDS
    $rdsStatus = aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE_ID --region $Region --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,Engine:Engine,Class:DBInstanceClass}' --output table 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "🗄️ RDS Instance:" -ForegroundColor Yellow
        Write-Host $rdsStatus
    }
    
    # S3
    $s3Status = aws s3api head-bucket --bucket $S3_BUCKET_NAME --region $Region 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "📦 S3 Bucket: $S3_BUCKET_NAME - ✓ Activo"
    }
}

# ===============================
# FUNCIÓN: Limpiar recursos
# ===============================
function Remove-Resources {
    Write-Warning "⚠️ ATENCIÓN: Esto eliminará TODOS los recursos de AWS"
    $confirm = Read-Host "¿Estás seguro? Escribe 'CONFIRMAR' para continuar"
    
    if ($confirm -ne "CONFIRMAR") {
        Write-Info "Operación cancelada"
        return
    }
    
    Write-Info "Eliminando recursos..."
    
    # Terminar EC2
    $instanceId = aws ec2 describe-instances --filters "Name=tag:Name,Values=$PROJECT_NAME-server" --region $Region --query 'Reservations[0].Instances[0].InstanceId' --output text 2>$null
    if ($instanceId -and $instanceId -ne "None") {
        aws ec2 terminate-instances --instance-ids $instanceId --region $Region
        Write-Success "✓ EC2 Instance terminada"
    }
    
    # Eliminar RDS
    aws rds delete-db-instance --db-instance-identifier $RDS_INSTANCE_ID --skip-final-snapshot --region $Region 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ RDS Instance eliminada"
    }
    
    # Vaciar y eliminar S3
    aws s3 rm "s3://$S3_BUCKET_NAME" --recursive 2>$null
    aws s3api delete-bucket --bucket $S3_BUCKET_NAME --region $Region 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ S3 Bucket eliminado"
    }
    
    Write-Success "✓ Limpieza completada"
}

# ===============================
# MAIN - Procesamiento de comandos
# ===============================
switch ($Action.ToLower()) {
    "help" { Show-Help }
    
    "setup" {
        if (Test-Prerequisites) {
            Write-Success "✓ Requisitos verificados"
        }
    }
    
    "create" {
        if (-not (Test-Prerequisites)) { return }
        
        Write-Info "🚀 Creando infraestructura completa..."
        New-KeyPair
        New-SecurityGroup
        New-S3Bucket
        New-RDSInstance
        Start-Sleep 5  # Pequeña pausa
        New-EC2Instance
        
        Write-Success "✅ Infraestructura creada exitosamente!"
        Write-Info "⏳ RDS puede tardar 10-15 minutos en estar disponible"
        Write-Info "🔍 Usar: .\deploy-ec2-stack.ps1 -Action status para verificar"
    }
    
    "deploy" {
        Deploy-Application
    }
    
    "status" {
        Get-Status
    }
    
    "cleanup" {
        Remove-Resources
    }
    
    default {
        Write-ErrorMsg "Comando no reconocido: $Action"
        Show-Help
    }
}
