# 🚀 ChambaPE - Deploy Completo en AWS
# Script de PowerShell para Windows

param(
    [string]$Action = "help",
    [string]$Environment = "prod"
)

$ErrorActionPreference = "Stop"

# Colores para output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Info($message) { Write-ColorOutput Blue "ℹ️ $message" }
function Write-Success($message) { Write-ColorOutput Green "✅ $message" }
function Write-Warning($message) { Write-ColorOutput Yellow "⚠️ $message" }
function Write-ErrorMsg($message) { Write-ColorOutput Red "❌ $message" }

# Configuración
$REGION = "us-east-2"
$PROJECT_NAME = "chambape"

function Show-Help {
    Write-Host "🚀 ChambaPE - Scripts de Deploy AWS"
    Write-Host ""
    Write-Host "Uso: .\deploy-complete.ps1 -Action [accion] [-Environment [env]]"
    Write-Host ""
    Write-Host "Acciones disponibles:"
    Write-Host "  setup       - Configurar infraestructura inicial en AWS"
    Write-Host "  deploy      - Desplegar aplicación (solo código)"
    Write-Host "  full        - Setup completo + deploy"
    Write-Host "  check       - Verificar estado de recursos"
    Write-Host "  logs        - Ver logs de la aplicación"
    Write-Host "  rollback    - Rollback a versión anterior"
    Write-Host "  cleanup     - Limpiar recursos (¡CUIDADO!)"
    Write-Host "  help        - Mostrar esta ayuda"
    Write-Host ""
    Write-Host "Ejemplos:"
    Write-Host "  .\deploy-complete.ps1 -Action setup"
    Write-Host "  .\deploy-complete.ps1 -Action deploy"
    Write-Host "  .\deploy-complete.ps1 -Action full"
    Write-Host "  .\deploy-complete.ps1 -Action check"
    Write-Host "  .\deploy-complete.ps1 -Action logs"
    Write-Host ""
    Write-Host "Prerequisitos:"
    Write-Host "  * AWS CLI instalado y configurado"
    Write-Host "  * Docker instalado"
    Write-Host "  * Permisos de administrador en AWS"
}

function Test-Prerequisites {
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
        return $identity.Account
    } catch {
        Write-ErrorMsg "No se puede conectar a AWS. Verifica tus credenciales."
        exit 1
    }
}

function Setup-Infrastructure {
    Write-Info "Configurando infraestructura AWS..."
    
    # Ejecutar script de setup
    if (Test-Path "scripts/setup-aws-infrastructure.sh") {
        bash scripts/setup-aws-infrastructure.sh
    } else {
        Write-ErrorMsg "Script de setup no encontrado"
        exit 1
    }
    
    # Crear RDS Database
    Write-Info "Creando base de datos RDS..."
    Create-RDSDatabase
    
    # Crear Application Load Balancer
    Write-Info "Creando Application Load Balancer..."
    Create-LoadBalancer
    
    Write-Success "Infraestructura configurada exitosamente"
}

function Create-RDSDatabase {
    # Cargar variables de recursos
    if (Test-Path "aws-resources.env") {
        Get-Content "aws-resources.env" | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                Set-Variable -Name $matches[1] -Value $matches[2] -Scope Script
            }
        }
    }
    
    $dbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 12 | ForEach-Object {[char]$_})
    
    try {
        aws rds create-db-instance `
            --db-instance-identifier "$PROJECT_NAME-db" `
            --db-instance-class "db.t3.micro" `
            --engine "postgres" `
            --engine-version "15.4" `
            --master-username "postgres" `
            --master-user-password "$dbPassword" `
            --allocated-storage 20 `
            --db-name "$PROJECT_NAME" `
            --vpc-security-group-ids $RDS_SG `
            --db-subnet-group-name "$PROJECT_NAME-subnet-group" `
            --backup-retention-period 7 `
            --storage-encrypted `
            --deletion-protection `
            --region $REGION
        
        Write-Success "Base de datos RDS creada"
        
        # Guardar credenciales en Secrets Manager
        $secret = @{
            username = "postgres"
            password = $dbPassword
            engine = "postgres"
            host = "$PROJECT_NAME-db.$REGION.rds.amazonaws.com"
            port = 5432
            dbname = $PROJECT_NAME
        } | ConvertTo-Json
        
        aws secretsmanager create-secret `
            --name "$PROJECT_NAME-db-credentials" `
            --description "ChambaPE Database Credentials" `
            --secret-string $secret `
            --region $REGION
            
        Write-Success "Credenciales guardadas en Secrets Manager"
        
    } catch {
        Write-Warning "Error creando RDS o ya existe"
    }
}

function Create-LoadBalancer {
    # Cargar variables
    if (Test-Path "aws-resources.env") {
        Get-Content "aws-resources.env" | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                Set-Variable -Name $matches[1] -Value $matches[2] -Scope Script
            }
        }
    }
    
    try {
        # Crear ALB
        $albResult = aws elbv2 create-load-balancer `
            --name "$PROJECT_NAME-alb" `
            --subnets $PUBLIC_SUBNET_1 $PUBLIC_SUBNET_2 `
            --security-groups $ALB_SG `
            --region $REGION | ConvertFrom-Json
        
        $albArn = $albResult.LoadBalancers[0].LoadBalancerArn
        
        # Crear Target Group
        $tgResult = aws elbv2 create-target-group `
            --name "$PROJECT_NAME-targets" `
            --protocol HTTP `
            --port 3000 `
            --vpc-id $VPC_ID `
            --target-type ip `
            --health-check-path "/api" `
            --health-check-interval-seconds 30 `
            --health-check-timeout-seconds 5 `
            --healthy-threshold-count 2 `
            --unhealthy-threshold-count 5 `
            --region $REGION | ConvertFrom-Json
        
        $tgArn = $tgResult.TargetGroups[0].TargetGroupArn
        
        # Crear Listener
        aws elbv2 create-listener `
            --load-balancer-arn $albArn `
            --protocol HTTP `
            --port 80 `
            --default-actions Type=forward,TargetGroupArn=$tgArn `
            --region $REGION
        
        Write-Success "Application Load Balancer creado"
        
        # Guardar ARN del Target Group
        Add-Content "aws-resources.env" "TARGET_GROUP_ARN=$tgArn"
        Add-Content "aws-resources.env" "ALB_ARN=$albArn"
        
    } catch {
        Write-Warning "Error creando ALB o ya existe"
    }
}

function Deploy-Application {
    Write-Info "Desplegando aplicación..."
    
    # Verificar que la infraestructura existe
    if (-not (Test-Path "aws-resources.env")) {
        Write-ErrorMsg "Infraestructura no configurada. Ejecuta primero: -Action setup"
        exit 1
    }
    
    # Ejecutar script de deploy
    if (Test-Path "scripts/deploy-aws.bat") {
        & "scripts/deploy-aws.bat"
    } else {
        Write-ErrorMsg "Script de deploy no encontrado"
        exit 1
    }
    
    Write-Success "Aplicación desplegada exitosamente"
}

function Check-Status {
    Write-Info "Verificando estado de recursos..."
    
    # Verificar ECS Service
    try {
        $service = aws ecs describe-services `
            --cluster "$PROJECT_NAME-cluster" `
            --services "$PROJECT_NAME-service" `
            --region $REGION | ConvertFrom-Json
        
        $running = $service.services[0].runningCount
        $desired = $service.services[0].desiredCount
        
        if ($running -eq $desired -and $running -gt 0) {
            Write-Success "ECS Service: $running/$desired tasks ejecutándose"
        } else {
            Write-Warning "ECS Service: $running/$desired tasks (esperando estabilización)"
        }
    } catch {
        Write-Warning "No se pudo verificar el estado del servicio ECS"
    }
    
    # Verificar RDS
    try {
        $db = aws rds describe-db-instances `
            --db-instance-identifier "$PROJECT_NAME-db" `
            --region $REGION | ConvertFrom-Json
        
        $status = $db.DBInstances[0].DBInstanceStatus
        Write-Success "RDS Database: $status"
    } catch {
        Write-Warning "No se pudo verificar el estado de RDS"
    }
    
    # Verificar ALB
    try {
        $alb = aws elbv2 describe-load-balancers `
            --names "$PROJECT_NAME-alb" `
            --region $REGION | ConvertFrom-Json
        
        $state = $alb.LoadBalancers[0].State.Code
        $dns = $alb.LoadBalancers[0].DNSName
        
        Write-Success "ALB: $state"
        Write-Info "URL: http://$dns"
        Write-Info "API Docs: http://$dns/docs"
    } catch {
        Write-Warning "No se pudo verificar el estado del ALB"
    }
}

function Show-Logs {
    Write-Info "Mostrando logs de la aplicación..."
    
    aws logs tail "/ecs/$PROJECT_NAME-api" --follow --region $REGION
}

function Cleanup-Resources {
    Write-Warning "⚠️ ATENCIÓN: Esto eliminará TODOS los recursos de AWS"
    $confirm = Read-Host "¿Estás seguro? Escribe 'DELETE' para confirmar"
    
    if ($confirm -ne "DELETE") {
        Write-Info "Operación cancelada"
        return
    }
    
    Write-Info "Eliminando recursos..."
    
    # Eliminar ECS Service
    try {
        aws ecs update-service `
            --cluster "$PROJECT_NAME-cluster" `
            --service "$PROJECT_NAME-service" `
            --desired-count 0 `
            --region $REGION
        
        aws ecs delete-service `
            --cluster "$PROJECT_NAME-cluster" `
            --service "$PROJECT_NAME-service" `
            --region $REGION
        
        Write-Success "Servicio ECS eliminado"
    } catch {
        Write-Warning "Error eliminando servicio ECS"
    }
    
    # Más pasos de cleanup...
    Write-Warning "Cleanup completo requiere script adicional"
}

# Función principal
switch ($Action) {
    "setup" {
        $accountId = Test-Prerequisites
        Setup-Infrastructure
    }
    "deploy" {
        $accountId = Test-Prerequisites
        Deploy-Application
    }
    "full" {
        $accountId = Test-Prerequisites
        Setup-Infrastructure
        Start-Sleep -Seconds 30  # Esperar que RDS esté listo
        Deploy-Application
    }
    "check" {
        Check-Status
    }
    "logs" {
        Show-Logs
    }
    "cleanup" {
        Cleanup-Resources
    }
    "help" {
        Show-Help
    }
    default {
        Write-ErrorMsg "Acción desconocida: $Action"
        Show-Help
        exit 1
    }
}

Write-Success "Operación '$Action' completada"