# ChambaPE - Deploy Basico AWS (S3 + EC2 + CloudWatch)
param(
    [string]$Action = "help"
)

# Configuracion
$REGION = "us-east-2"
$PROJECT_NAME = "chambape"
$INSTANCE_TYPE = "t2.micro"
$KEY_PAIR_NAME = "chambape-keypair"

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
    Write-Host "ChambaPE - Deploy Basico AWS" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Recursos que gestiona:"
    Write-Host "  S3 Bucket para archivos"
    Write-Host "  Instancia EC2 basica"
    Write-Host "  CloudWatch Logs"
    Write-Host ""
    Write-Host "Uso: .\deploy-basic-aws.ps1 -Action [accion]"
    Write-Host ""
    Write-Host "Acciones disponibles:"
    Write-Host "  check       - Verificar prerequisitos y conexion"
    Write-Host "  create      - Crear todos los recursos basicos"
    Write-Host "  test        - Probar que los recursos funcionan"
    Write-Host "  status      - Ver estado de todos los recursos"
    Write-Host "  cleanup     - Eliminar todos los recursos creados"
    Write-Host "  help        - Mostrar esta ayuda"
    Write-Host ""
    Write-Host "Ejemplo: .\deploy-basic-aws.ps1 -Action create"
    exit 0
}

# Verificar prerequisitos
Write-Info "Verificando prerequisitos..."

# Verificar AWS CLI
try {
    $awsVersion = aws --version 2>$null
    Write-Success "AWS CLI: $awsVersion"
} catch {
    Write-ErrorMsg "AWS CLI no está instalado"
    exit 1
}

# Verificar conexión AWS
try {
    $identity = aws sts get-caller-identity | ConvertFrom-Json
    Write-Success "Conectado a AWS como: $($identity.Arn)"
    $global:accountId = $identity.Account
} catch {
    Write-ErrorMsg "No se puede conectar a AWS. Verifica tus credenciales."
    exit 1
}

# Ejecutar acción solicitada
switch ($Action) {
    "check" {
        Write-Success "Todos los prerequisitos estan OK"
        Write-Info "Account ID: $global:accountId"
        Write-Info "Region: $REGION"
        Write-Info "Ready para crear recursos basicos de AWS"
    }
    
    "create" {
        Write-Info "Creando recursos basicos de AWS..."
        
        # 1. CREAR S3 BUCKET
        Write-Info "Creando S3 Bucket..."
        $bucketName = "$PROJECT_NAME-files-$(Get-Random -Maximum 9999)"
        
        try {
            aws s3 mb "s3://$bucketName" --region $REGION
            Write-Success "S3 Bucket creado: $bucketName"
            
            # Subir un archivo de prueba
            "Hola desde ChambaPE - $(Get-Date)" | Out-File -FilePath "test-file.txt" -Encoding UTF8
            aws s3 cp "test-file.txt" "s3://$bucketName/test-file.txt"
            Remove-Item "test-file.txt" -Force
            Write-Success "Archivo de prueba subido al bucket"
            
        } catch {
            Write-ErrorMsg "Error creando S3 Bucket"
        }
        
        # 2. CREAR SECURITY GROUP PARA EC2
        Write-Info "Creando Security Group para EC2..."
        $vpcId = aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region $REGION --query "Vpcs[0].VpcId" --output text
        
        $sgId = aws ec2 create-security-group --group-name "$PROJECT_NAME-ec2-sg" --description "Security group for ChambaPE EC2" --vpc-id $vpcId --region $REGION --query "GroupId" --output text 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            # Permitir SSH y HTTP
            aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $REGION > $null
            aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION > $null
            Write-Success "Security Group creado: $sgId"
        } else {
            $sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$PROJECT_NAME-ec2-sg" --region $REGION --query "SecurityGroups[0].GroupId" --output text
            Write-Warning "Security Group ya existe: $sgId"
        }
        
        # 3. CREAR INSTANCIA EC2
        Write-Info "Creando instancia EC2..."
        
        # Obtener la AMI mas reciente de Amazon Linux 2
        $amiId = aws ec2 describe-images --owners amazon --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" "Name=state,Values=available" --region $REGION --query "Images | sort_by(@, &CreationDate) | [-1].ImageId" --output text
        Write-Info "Usando AMI: $amiId"
        
        # Script de inicializacion para la instancia
        $userData = @"
#!/bin/bash
yum update -y
yum install -y httpd
systemctl start httpd
systemctl enable httpd
echo "<h1>ChambaPE Server</h1>" > /var/www/html/index.html
echo "<p>Esta es una instancia EC2 basica para ChambaPE</p>" >> /var/www/html/index.html
echo "<p>Fecha de creacion: $(date)</p>" >> /var/www/html/index.html
"@
        
        $userDataEncoded = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($userData))
        
        try {
            $instanceResult = aws ec2 run-instances --image-id $amiId --count 1 --instance-type $INSTANCE_TYPE --security-group-ids $sgId --user-data $userDataEncoded --region $REGION --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$PROJECT_NAME-server},{Key=Project,Value=ChambaPE}]" | ConvertFrom-Json
            
            $instanceId = $instanceResult.Instances[0].InstanceId
            Write-Success "Instancia EC2 creada: $instanceId"
            Write-Info "Esperando que la instancia este ejecutandose..."
            
            aws ec2 wait instance-running --instance-ids $instanceId --region $REGION
            
            # Obtener IP publica
            $publicIp = aws ec2 describe-instances --instance-ids $instanceId --region $REGION --query "Reservations[0].Instances[0].PublicIpAddress" --output text
            Write-Success "Instancia EC2 esta ejecutandose"
            Write-Success "IP publica: $publicIp"
            Write-Info "URL del servidor: http://$publicIp"
            
        } catch {
            Write-ErrorMsg "Error creando instancia EC2"
        }
        
        # 4. CREAR CLOUDWATCH LOG GROUP
        Write-Info "Creando CloudWatch Log Group..."
        
        try {
            aws logs create-log-group --log-group-name "/aws/chambape/application" --region $REGION 2>$null
            Write-Success "CloudWatch Log Group creado: /aws/chambape/application"
            
            # Enviar un log de prueba
            aws logs create-log-stream --log-group-name "/aws/chambape/application" --log-stream-name "test-stream" --region $REGION
            
            $timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
            $logMessage = "ChambaPE aplicacion iniciada - $(Get-Date)"
            
            aws logs put-log-events --log-group-name "/aws/chambape/application" --log-stream-name "test-stream" --log-events "timestamp=$timestamp,message=$logMessage" --region $REGION > $null
            
            Write-Success "Log de prueba enviado a CloudWatch"
            
        } catch {
            Write-Warning "CloudWatch Log Group ya existe o error creandolo"
        }
        
        Write-Success "Todos los recursos basicos han sido creados exitosamente!"
        Write-Info "Ejecuta: .\deploy-basic-aws.ps1 -Action status para ver los detalles"
    }
    
    "test" {
        Write-Info "Probando que los recursos funcionan..."
        
        # TEST S3
        Write-Info "Probando S3..."
        $buckets = aws s3 ls | Select-String "$PROJECT_NAME-files"
        if ($buckets) {
            $bucketName = ($buckets -split '\s+')[2]
            Write-Success "S3 Bucket encontrado: $bucketName"
            
            # Probar descarga
            try {
                aws s3 cp "s3://$bucketName/test-file.txt" "downloaded-test.txt"
                $content = Get-Content "downloaded-test.txt"
                Write-Success "Archivo descargado: $content"
                Remove-Item "downloaded-test.txt" -Force
            } catch {
                Write-Warning "No se pudo descargar archivo de prueba"
            }
        } else {
            Write-Warning "No se encontro S3 Bucket"
        }
        
        # TEST EC2
        Write-Info "Probando EC2..."
        $instances = aws ec2 describe-instances --filters "Name=tag:Project,Values=ChambaPE" "Name=instance-state-name,Values=running" --region $REGION --query "Reservations[*].Instances[*].[InstanceId,PublicIpAddress,State.Name]" --output text
        
        if ($instances) {
            $instanceData = $instances -split '\s+'
            $instanceId = $instanceData[0]
            $publicIp = $instanceData[1]
            $state = $instanceData[2]
            
            Write-Success "Instancia EC2: $instanceId ($state)"
            Write-Success "IP Publica: $publicIp"
            Write-Info "Prueba el servidor: http://$publicIp"
            
            # Probar conectividad HTTP
            try {
                $response = Invoke-WebRequest -Uri "http://$publicIp" -TimeoutSec 10 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-Success "Servidor web responde correctamente"
                } else {
                    Write-Warning "Servidor web no responde aun (puede estar iniciandose)"
                }
            } catch {
                Write-Warning "No se pudo conectar al servidor web (puede estar iniciandose)"
            }
        } else {
            Write-Warning "No se encontro instancia EC2 ejecutandose"
        }
        
        # TEST CLOUDWATCH
        Write-Info "Probando CloudWatch..."
        try {
            $logGroups = aws logs describe-log-groups --log-group-name-prefix "/aws/chambape" --region $REGION | ConvertFrom-Json
            if ($logGroups.logGroups.Count -gt 0) {
                $logGroup = $logGroups.logGroups[0].logGroupName
                Write-Success "CloudWatch Log Group: $logGroup"
                
                # Obtener logs recientes
                $streams = aws logs describe-log-streams --log-group-name $logGroup --region $REGION | ConvertFrom-Json
                if ($streams.logStreams.Count -gt 0) {
                    Write-Success "Log streams disponibles: $($streams.logStreams.Count)"
                }
            }
        } catch {
            Write-Warning "Error verificando CloudWatch"
        }
    }
    
    "status" {
        Write-Info "Estado de recursos basicos..."
        
        # S3 STATUS
        Write-Host "`nS3 BUCKETS:" -ForegroundColor Cyan
        $buckets = aws s3 ls | Select-String "$PROJECT_NAME-files"
        if ($buckets) {
            $buckets | ForEach-Object {
                $bucketName = ($_ -split '\s+')[2]
                Write-Success "Bucket: $bucketName"
                $objects = aws s3 ls "s3://$bucketName" --recursive
                if ($objects) {
                    Write-Info "   Archivos: $(($objects | Measure-Object).Count)"
                }
            }
        } else {
            Write-Warning "No hay buckets S3 de ChambaPE"
        }
        
        # EC2 STATUS
        Write-Host "`nINSTANCIAS EC2:" -ForegroundColor Cyan
        $instances = aws ec2 describe-instances --filters "Name=tag:Project,Values=ChambaPE" --region $REGION --query "Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name,PublicIpAddress,Tags[?Key=='Name'].Value|[0]]" --output text
        
        if ($instances) {
            $instances -split "`n" | ForEach-Object {
                if ($_.Trim()) {
                    $data = $_ -split '\s+'
                    $id = $data[0]
                    $type = $data[1]
                    $state = $data[2]
                    $ip = if ($data[3] -ne "None") { $data[3] } else { "Sin IP publica" }
                    $name = if ($data.Count -gt 4) { $data[4] } else { "Sin nombre" }
                    
                    $stateIcon = if ($state -eq "running") { "[OK]" } else { "[WARN]" }
                    Write-Host "   $stateIcon $name ($id) - $type - $state" -ForegroundColor $(if ($state -eq "running") { "Green" } else { "Yellow" })
                    if ($ip -ne "Sin IP publica") {
                        Write-Info "      URL: http://$ip"
                    }
                }
            }
        } else {
            Write-Warning "No hay instancias EC2 de ChambaPE"
        }
        
        # CLOUDWATCH STATUS
        Write-Host "`nCLOUDWATCH LOGS:" -ForegroundColor Cyan
        try {
            $logGroups = aws logs describe-log-groups --log-group-name-prefix "/aws/chambape" --region $REGION | ConvertFrom-Json
            if ($logGroups.logGroups.Count -gt 0) {
                $logGroups.logGroups | ForEach-Object {
                    Write-Success "Log Group: $($_.logGroupName)"
                    Write-Info "   Tamaño: $([math]::Round($_.storedBytes / 1024, 2)) KB"
                    Write-Info "   Creado: $(Get-Date $_.creationTime)"
                }
            } else {
                Write-Warning "No hay Log Groups de ChambaPE"
            }
        } catch {
            Write-Warning "Error verificando CloudWatch"
        }
    }
    
    "cleanup" {
        Write-Warning "ELIMINANDO todos los recursos de ChambaPE..."
        Write-Host "Esta accion eliminara:" -ForegroundColor Yellow
        Write-Host "  - Buckets S3 y su contenido" -ForegroundColor Yellow
        Write-Host "  - Instancias EC2" -ForegroundColor Yellow
        Write-Host "  - Security Groups" -ForegroundColor Yellow
        Write-Host "  - CloudWatch Log Groups" -ForegroundColor Yellow
        
        $confirmation = Read-Host "Estas seguro? Escribe 'DELETE' para confirmar"
        
        if ($confirmation -ne "DELETE") {
            Write-Info "Operacion cancelada"
            exit 0
        }
        
        # ELIMINAR INSTANCIAS EC2
        Write-Info "Eliminando instancias EC2..."
        $instances = aws ec2 describe-instances --filters "Name=tag:Project,Values=ChambaPE" "Name=instance-state-name,Values=running,stopped" --region $REGION --query "Reservations[*].Instances[*].InstanceId" --output text
        
        if ($instances) {
            $instanceIds = $instances -split '\s+'
            foreach ($instanceId in $instanceIds) {
                if ($instanceId.Trim()) {
                    aws ec2 terminate-instances --instance-ids $instanceId --region $REGION > $null
                    Write-Success "Instancia terminada: $instanceId"
                }
            }
        }
        
        # ELIMINAR S3 BUCKETS
        Write-Info "Eliminando buckets S3..."
        $buckets = aws s3 ls | Select-String "$PROJECT_NAME-files"
        if ($buckets) {
            $buckets | ForEach-Object {
                $bucketName = ($_ -split '\s+')[2]
                aws s3 rm "s3://$bucketName" --recursive
                aws s3 rb "s3://$bucketName"
                Write-Success "Bucket eliminado: $bucketName"
            }
        }
        
        # ELIMINAR SECURITY GROUPS
        Write-Info "Eliminando Security Groups..."
        Start-Sleep -Seconds 30  # Esperar que las instancias terminen
        try {
            $sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$PROJECT_NAME-ec2-sg" --region $REGION --query "SecurityGroups[0].GroupId" --output text
            if ($sgId -ne "None") {
                aws ec2 delete-security-group --group-id $sgId --region $REGION
                Write-Success "Security Group eliminado: $sgId"
            }
        } catch {
            Write-Warning "Security Group puede estar en uso aun"
        }
        
        # ELIMINAR CLOUDWATCH LOG GROUPS
        Write-Info "Eliminando CloudWatch Log Groups..."
        try {
            aws logs delete-log-group --log-group-name "/aws/chambape/application" --region $REGION
            Write-Success "CloudWatch Log Group eliminado"
        } catch {
            Write-Warning "Error eliminando CloudWatch Log Group"
        }
        
        Write-Success "Limpieza completada"
    }
    
    default {
        Write-ErrorMsg "Acción desconocida: $Action"
        Write-Info "Usa -Action help para ver las opciones disponibles"
        exit 1
    }
}

Write-Success "Operacion '$Action' completada"
