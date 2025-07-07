# 🚀 ChambaPE - Deploy Simple en AWS
param(
    [string]$Action = "help"
)

# Configuración
$REGION = "us-east-2"
$PROJECT_NAME = "chambape"

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
    Write-Host "🚀 ChambaPE - Scripts de Deploy AWS" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso: .\deploy-simple.ps1 -Action [accion]"
    Write-Host ""
    Write-Host "Acciones disponibles:"
    Write-Host "  check       - Verificar prerequisitos y estado"
    Write-Host "  setup       - Configurar infraestructura inicial"
    Write-Host "  deploy      - Desplegar aplicación"
    Write-Host "  service     - Crear servicio ECS y Load Balancer"
    Write-Host "  full        - Setup completo + deploy + servicio"
    Write-Host "  status      - Ver estado de recursos"
    Write-Host "  help        - Mostrar esta ayuda"
    Write-Host ""
    Write-Host "Ejemplo: .\deploy-simple.ps1 -Action check"
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

# Verificar Docker
try {
    $dockerVersion = docker --version
    Write-Success "Docker: $dockerVersion"
} catch {
    Write-ErrorMsg "Docker no está instalado"
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
        Write-Success "Todos los prerequisitos están OK"
        Write-Info "Account ID: $global:accountId"
        Write-Info "Region: $REGION"
        
        # Verificar si ya hay recursos creados
        try {
            $clusters = aws ecs list-clusters --region $REGION | ConvertFrom-Json
            if ($clusters.clusterArns -match "chambape") {
                Write-Success "ECS Cluster 'chambape' ya existe"
            } else {
                Write-Warning "ECS Cluster 'chambape' no existe"
            }
        } catch {
            Write-Warning "No se pudo verificar ECS Clusters"
        }
        
        try {
            $dbs = aws rds describe-db-instances --region $REGION 2>$null | ConvertFrom-Json
            $chambaDB = $dbs.DBInstances | Where-Object { $_.DBInstanceIdentifier -eq "chambape-db" }
            if ($chambaDB) {
                Write-Success "RDS Database 'chambape-db' existe - Estado: $($chambaDB.DBInstanceStatus)"
            } else {
                Write-Warning "RDS Database 'chambape-db' no existe"
            }
        } catch {
            Write-Warning "No se pudo verificar RDS Databases"
        }
    }
    
    "setup" {
        Write-Info "Iniciando configuración de infraestructura..."
        
        # Crear infraestructura básica directamente con PowerShell
        Write-Info "Creando infraestructura básica en AWS..."
        
        # Obtener VPC por defecto
        Write-Info "Obteniendo VPC por defecto..."
        $defaultVpc = aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region $REGION --query "Vpcs[0].VpcId" --output text
        Write-Success "VPC por defecto: $defaultVpc"
        
        # Obtener subnets públicas
        $subnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$defaultVpc" "Name=default-for-az,Values=true" --region $REGION --query "Subnets[*].SubnetId" --output text
        $subnetArray = $subnets -split '\s+'
        Write-Success "Subnets encontradas: $($subnetArray.Count)"
        
        # Crear Security Group para ALB
        Write-Info "Creando Security Group para Load Balancer..."
        $albSgId = aws ec2 create-security-group --group-name "$PROJECT_NAME-alb-sg" --description "Security group for ChambaPE ALB" --vpc-id $defaultVpc --region $REGION --query "GroupId" --output text 2>$null
        if ($LASTEXITCODE -eq 0) {
            # Permitir tráfico HTTP desde internet
            aws ec2 authorize-security-group-ingress --group-id $albSgId --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION > $null
            aws ec2 authorize-security-group-ingress --group-id $albSgId --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $REGION > $null
            Write-Success "Security Group ALB creado: $albSgId"
        } else {
            $albSgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$PROJECT_NAME-alb-sg" --region $REGION --query "SecurityGroups[0].GroupId" --output text
            Write-Warning "Security Group ALB ya existe: $albSgId"
        }
        
        # Crear Security Group para ECS
        Write-Info "Creando Security Group para ECS..."
        $ecsSgId = aws ec2 create-security-group --group-name "$PROJECT_NAME-ecs-sg" --description "Security group for ChambaPE ECS tasks" --vpc-id $defaultVpc --region $REGION --query "GroupId" --output text 2>$null
        if ($LASTEXITCODE -eq 0) {
            # Permitir tráfico desde ALB
            aws ec2 authorize-security-group-ingress --group-id $ecsSgId --protocol tcp --port 3000 --source-group $albSgId --region $REGION > $null
            Write-Success "Security Group ECS creado: $ecsSgId"
        } else {
            $ecsSgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$PROJECT_NAME-ecs-sg" --region $REGION --query "SecurityGroups[0].GroupId" --output text
            Write-Warning "Security Group ECS ya existe: $ecsSgId"
        }
        
        # Crear ECS Cluster
        try {
            Write-Info "Creando ECS Cluster..."
            $clusterResult = aws ecs create-cluster --cluster-name "$PROJECT_NAME-cluster" --region $REGION | ConvertFrom-Json
            Write-Success "ECS Cluster creado: $($clusterResult.cluster.clusterName)"
        } catch {
            Write-Warning "ECS Cluster ya existe o error creandolo"
        }
        
        # Crear S3 Bucket para uploads
        try {
            Write-Info "Creando S3 Bucket para uploads..."
            aws s3 mb "s3://$PROJECT_NAME-uploads-prod" --region $REGION
            Write-Success "S3 Bucket creado: $PROJECT_NAME-uploads-prod"
        } catch {
            Write-Warning "S3 Bucket ya existe o error creandolo"
        }
        
        # Crear repositorio ECR si no existe
        try {
            Write-Info "Verificando repositorio ECR..."
            aws ecr create-repository --repository-name "$PROJECT_NAME-api" --region $REGION > $null
            Write-Success "Repositorio ECR creado: $PROJECT_NAME-api"
        } catch {
            Write-Warning "Repositorio ECR ya existe"
        }
        
        # Crear rol de ejecución ECS si no existe
        Write-Info "Verificando rol de ejecución ECS..."
        $roleExists = aws iam get-role --role-name ecsTaskExecutionRole 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Rol ecsTaskExecutionRole ya existe"
        } else {
            Write-Info "Creando rol de ejecución ECS..."
            
            # Crear política de confianza
            $trustPolicy = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
            
            # Crear el rol
            aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document $trustPolicy > $null
            
            # Asociar política managed
            aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy" > $null
            
            Write-Success "Rol ecsTaskExecutionRole creado"
        }
    }
    
    "deploy" {
        Write-Info "Desplegando aplicación..."
        
        # Verificar que Docker esté corriendo
        try {
            docker ps > $null
            Write-Success "Docker está corriendo"
        } catch {
            Write-ErrorMsg "Docker no está corriendo. Inicia Docker Desktop."
            exit 1
        }
        
        # Obtener Account ID para ECR
        $ecrUri = "$global:accountId.dkr.ecr.$REGION.amazonaws.com/$PROJECT_NAME-api"
        
        Write-Info "Construyendo imagen Docker..."
        $buildResult = docker build -f Dockerfile.aws -t "$PROJECT_NAME-api:latest" .
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMsg "Error construyendo la imagen Docker"
            exit 1
        }
        Write-Success "Imagen Docker construida exitosamente"
        
        Write-Info "Creando repositorio ECR si no existe..."
        try {
            aws ecr create-repository --repository-name "$PROJECT_NAME-api" --region $REGION
        } catch {
            Write-Warning "Repositorio ECR ya existe"
        }
        
        Write-Info "Autenticando con ECR..."
        $loginPassword = aws ecr get-login-password --region $REGION
        $loginPassword | docker login --username AWS --password-stdin "$global:accountId.dkr.ecr.$REGION.amazonaws.com"
        
        Write-Info "Tageando y subiendo imagen..."
        Write-Info "ECR URI: $ecrUri"
        Write-Info "Source image: $PROJECT_NAME-api:latest"
        $targetImage = "$ecrUri`:latest"
        Write-Info "Target image: $targetImage"
        
        docker tag "$PROJECT_NAME-api:latest" $targetImage
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMsg "Error tageando la imagen"
            exit 1
        }
        
        docker push $targetImage
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMsg "Error subiendo la imagen a ECR"
            exit 1
        }
        
        Write-Success "Imagen subida a ECR exitosamente"
        Write-Info "URI de imagen: $targetImage"
        
        # Crear task definition para ECS
        Write-Info "Creando Task Definition para ECS..."
        
        # Crear log group si no existe
        try {
            aws logs create-log-group --log-group-name "/ecs/$PROJECT_NAME-api" --region $REGION 2>$null
            Write-Success "Log group creado"
        } catch {
            Write-Info "Log group ya existe"
        }
        
        # Crear archivo temporal para task definition
        $taskDef = @{
            family = "$PROJECT_NAME-api"
            networkMode = "awsvpc"
            requiresCompatibilities = @("FARGATE")
            cpu = "256"
            memory = "512"
            executionRoleArn = "arn:aws:iam::$global:accountId`:role/ecsTaskExecutionRole"
            containerDefinitions = @(
                @{
                    name = "$PROJECT_NAME-api"
                    image = $targetImage
                    portMappings = @(
                        @{
                            containerPort = 3000
                            protocol = "tcp"
                        }
                    )
                    essential = $true
                    logConfiguration = @{
                        logDriver = "awslogs"
                        options = @{
                            "awslogs-group" = "/ecs/$PROJECT_NAME-api"
                            "awslogs-region" = $REGION
                            "awslogs-stream-prefix" = "ecs"
                        }
                    }
                    environment = @(
                        @{
                            name = "NODE_ENV"
                            value = "production"
                        }
                        @{
                            name = "PORT"
                            value = "3000"
                        }
                    )
                }
            )
        }
        
        # Convertir a JSON y guardar
        $taskDef | ConvertTo-Json -Depth 10 | Out-File -FilePath "task-def-temp.json" -Encoding UTF8
        
        # Registrar task definition
        $taskDefResult = aws ecs register-task-definition --cli-input-json "file://task-def-temp.json" --region $REGION | ConvertFrom-Json
        Remove-Item "task-def-temp.json" -Force
        
        if ($taskDefResult) {
            Write-Success "Task Definition registrada: $($taskDefResult.taskDefinition.taskDefinitionArn)"
        } else {
            Write-ErrorMsg "Error creando Task Definition"
            exit 1
        }
    }
    
    "service" {
        Write-Info "Creando servicio ECS y Load Balancer..."
        
        # Obtener información necesaria
        $defaultVpc = aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region $REGION --query "Vpcs[0].VpcId" --output text
        $subnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$defaultVpc" "Name=default-for-az,Values=true" --region $REGION --query "Subnets[*].SubnetId" --output text
        $subnetArray = $subnets -split '\s+'
        $albSgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$PROJECT_NAME-alb-sg" --region $REGION --query "SecurityGroups[0].GroupId" --output text
        $ecsSgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$PROJECT_NAME-ecs-sg" --region $REGION --query "SecurityGroups[0].GroupId" --output text
        
        # Crear Application Load Balancer
        Write-Info "Creando Application Load Balancer..."
        $albArn = aws elbv2 create-load-balancer --name "$PROJECT_NAME-alb" --subnets $subnetArray[0] $subnetArray[1] --security-groups $albSgId --region $REGION --query "LoadBalancers[0].LoadBalancerArn" --output text 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "ALB creado: $albArn"
        } else {
            $albArn = aws elbv2 describe-load-balancers --names "$PROJECT_NAME-alb" --region $REGION --query "LoadBalancers[0].LoadBalancerArn" --output text
            Write-Warning "ALB ya existe: $albArn"
        }
        
        # Crear Target Group
        Write-Info "Creando Target Group..."
        $tgArn = aws elbv2 create-target-group --name "$PROJECT_NAME-tg" --protocol HTTP --port 3000 --vpc-id $defaultVpc --target-type ip --health-check-path "/" --health-check-interval-seconds 30 --health-check-timeout-seconds 5 --healthy-threshold-count 2 --unhealthy-threshold-count 5 --region $REGION --query "TargetGroups[0].TargetGroupArn" --output text 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Target Group creado: $tgArn"
        } else {
            $tgArn = aws elbv2 describe-target-groups --names "$PROJECT_NAME-tg" --region $REGION --query "TargetGroups[0].TargetGroupArn" --output text
            Write-Warning "Target Group ya existe: $tgArn"
        }
        
        # Crear Listener
        Write-Info "Creando Listener..."
        $listenerArn = aws elbv2 create-listener --load-balancer-arn $albArn --protocol HTTP --port 80 --default-actions "Type=forward,TargetGroupArn=$tgArn" --region $REGION --query "Listeners[0].ListenerArn" --output text 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Listener creado: $listenerArn"
        } else {
            Write-Warning "Listener ya existe"
        }
        
        # Crear servicio ECS
        Write-Info "Creando servicio ECS..."
        $serviceResult = aws ecs create-service --cluster "$PROJECT_NAME-cluster" --service-name "$PROJECT_NAME-service" --task-definition "$PROJECT_NAME-api:1" --desired-count 1 --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[$($subnetArray[0]),$($subnetArray[1])],securityGroups=[$ecsSgId],assignPublicIp=ENABLED}" --load-balancers "targetGroupArn=$tgArn,containerName=$PROJECT_NAME-api,containerPort=3000" --region $REGION 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Servicio ECS creado exitosamente"
        } else {
            Write-Warning "Error creando servicio ECS o ya existe"
        }
        
        # Obtener URL del Load Balancer
        Start-Sleep -Seconds 10
        $albDns = aws elbv2 describe-load-balancers --names "$PROJECT_NAME-alb" --region $REGION --query "LoadBalancers[0].DNSName" --output text
        Write-Success "🌐 URL de la aplicación: http://$albDns"
        Write-Info "📚 API Docs: http://$albDns/docs"
        Write-Info "⏱️  Nota: La aplicación puede tardar 2-3 minutos en estar disponible"
    }
    
    "full" {
        Write-Info "Ejecutando deploy completo..."
        
        # Setup
        & $MyInvocation.MyCommand.Path -Action setup
        
        Write-Info "Esperando 30 segundos para que la infraestructura esté lista..."
        Start-Sleep -Seconds 30
        
        # Deploy
        & $MyInvocation.MyCommand.Path -Action deploy
        
        Write-Info "Esperando 10 segundos antes de crear el servicio..."
        Start-Sleep -Seconds 10
        
        # Service
        & $MyInvocation.MyCommand.Path -Action service
        
        Write-Success "🎉 Deploy completo finalizado"
        Write-Info "🚀 ChambaPE está ahora disponible en AWS!"
    }
    
    "status" {
        Write-Info "Verificando estado de recursos..."
        
        # Estado de ECS Cluster
        try {
            $cluster = aws ecs describe-clusters --clusters "$PROJECT_NAME-cluster" --region $REGION --query "clusters[0]" | ConvertFrom-Json
            Write-Success "ECS Cluster: $($cluster.clusterName) - Estado: $($cluster.status)"
            Write-Info "Tasks activas: $($cluster.activeTasksCount) | Servicios: $($cluster.activeServicesCount)"
        } catch {
            Write-Warning "No se pudo verificar ECS Cluster"
        }
        
        # Estado de servicios ECS
        try {
            $service = aws ecs describe-services --cluster "$PROJECT_NAME-cluster" --services "$PROJECT_NAME-service" --region $REGION --query "services[0]" | ConvertFrom-Json 2>$null
            if ($service) {
                Write-Success "Servicio ECS: $($service.serviceName) - Estado: $($service.status)"
                Write-Info "Tasks deseadas: $($service.desiredCount) | Ejecutándose: $($service.runningCount)"
            } else {
                Write-Warning "No hay servicios ECS corriendo"
            }
        } catch {
            Write-Warning "No se pudo verificar servicios ECS"
        }
        
        # Estado de Load Balancer
        try {
            $alb = aws elbv2 describe-load-balancers --names "$PROJECT_NAME-alb" --region $REGION --query "LoadBalancers[0]" | ConvertFrom-Json 2>$null
            if ($alb) {
                $dns = $alb.DNSName
                $state = $alb.State.Code
                Write-Success "ALB Estado: $state"
                Write-Success "🌐 URL: http://$dns"
                Write-Info "📚 API Docs: http://$dns/docs"
                Write-Info "📋 Health: http://$dns/health"
            } else {
                Write-Warning "Load Balancer no encontrado"
            }
        } catch {
            Write-Warning "Load Balancer no existe aún"
        }
        
        # Estado de Target Group
        try {
            $tg = aws elbv2 describe-target-health --target-group-arn $(aws elbv2 describe-target-groups --names "$PROJECT_NAME-tg" --region $REGION --query "TargetGroups[0].TargetGroupArn" --output text) --region $REGION | ConvertFrom-Json 2>$null
            if ($tg.TargetHealthDescriptions.Count -gt 0) {
                $healthyTargets = ($tg.TargetHealthDescriptions | Where-Object { $_.TargetHealth.State -eq "healthy" }).Count
                $totalTargets = $tg.TargetHealthDescriptions.Count
                Write-Success "Targets saludables: $healthyTargets/$totalTargets"
            } else {
                Write-Warning "No hay targets registrados"
            }
        } catch {
            Write-Warning "No se pudo verificar Target Group"
        }
    }
    
    default {
        Write-ErrorMsg "Acción desconocida: $Action"
        Write-Info "Usa -Action help para ver las opciones disponibles"
        exit 1
    }
}

Write-Success "Operación '$Action' completada exitosamente"
