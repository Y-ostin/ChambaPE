# ===============================
# ChambaPE - Script de Verificación 
# Verificar configuración antes del deploy
# ===============================

param(
    [string]$Region = "us-east-1"
)

function Write-Info($message) { Write-Host "[INFO] $message" -ForegroundColor Blue }
function Write-Success($message) { Write-Host "[OK] $message" -ForegroundColor Green }
function Write-Warning($message) { Write-Host "[WARNING] $message" -ForegroundColor Yellow }
function Write-ErrorMsg($message) { Write-Host "[ERROR] $message" -ForegroundColor Red }

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "ChambaPE - Verificacion de Configuracion" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Verificar AWS CLI
Write-Info "Verificando AWS CLI..."
try {
    $awsVersion = aws --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "AWS CLI instalado: $awsVersion"
    } else {
        Write-ErrorMsg "AWS CLI no encontrado"
        Write-Host "Instalar desde: https://aws.amazon.com/cli/" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-ErrorMsg "Error verificando AWS CLI"
    exit 1
}

# Verificar credenciales
Write-Info "Verificando credenciales AWS..."
try {
    $identity = aws sts get-caller-identity --output json 2>$null | ConvertFrom-Json
    if ($identity) {
        Write-Success "Usuario AWS: $($identity.UserId)"
        Write-Success "Account ID: $($identity.Account)"
    } else {
        Write-ErrorMsg "Credenciales AWS no validas"
        Write-Host "Ejecutar: aws configure" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-ErrorMsg "Error verificando credenciales AWS"
    Write-Host "Ejecutar: aws configure" -ForegroundColor Yellow
    exit 1
}

# Verificar región
Write-Info "Verificando region: $Region"
try {
    $regionCheck = aws ec2 describe-regions --region-names $Region --output json 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Region $Region disponible"
    } else {
        Write-ErrorMsg "Region $Region no valida"
        exit 1
    }
} catch {
    Write-ErrorMsg "Error verificando region"
    exit 1
}

# Verificar Docker
Write-Info "Verificando Docker..."
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker instalado: $dockerVersion"
    } else {
        Write-Warning "Docker no encontrado (opcional para este deploy)"
    }
} catch {
    Write-Warning "Docker no encontrado (opcional para este deploy)"
}

# Verificar archivos del proyecto
Write-Info "Verificando archivos del proyecto..."

$requiredFiles = @(
    "package.json",
    "src/main.ts", 
    ".env.production",
    "deploy-ec2-stack.ps1"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Success "Archivo encontrado: $file"
    } else {
        Write-ErrorMsg "Archivo faltante: $file"
    }
}

# Verificar configuración .env.production
Write-Info "Verificando .env.production..."
if (Test-Path ".env.production") {
    $envContent = Get-Content ".env.production" -Raw
    
    # Variables críticas
    $criticalVars = @(
        "DATABASE_HOST",
        "DATABASE_USERNAME", 
        "DATABASE_PASSWORD",
        "AWS_S3_REGION",
        "AWS_DEFAULT_S3_BUCKET",
        "AUTH_JWT_SECRET"
    )
    
    foreach ($var in $criticalVars) {
        if ($envContent -match "$var=.+") {
            Write-Success "Variable configurada: $var"
        } else {
            Write-Warning "Variable sin configurar: $var"
        }
    }
} else {
    Write-ErrorMsg ".env.production no encontrado"
}

# Verificar permisos IAM básicos
Write-Info "Verificando permisos AWS basicos..."

# EC2
try {
    $ec2Test = aws ec2 describe-instances --max-items 1 --output json 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Permisos EC2: OK"
    } else {
        Write-Warning "Permisos EC2: Sin verificar"
    }
} catch {
    Write-Warning "Permisos EC2: Sin verificar"
}

# RDS
try {
    $rdsTest = aws rds describe-db-instances --max-items 1 --output json 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Permisos RDS: OK"
    } else {
        Write-Warning "Permisos RDS: Sin verificar"
    }
} catch {
    Write-Warning "Permisos RDS: Sin verificar"
}

# S3
try {
    $s3Test = aws s3 ls 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Permisos S3: OK"
    } else {
        Write-Warning "Permisos S3: Sin verificar"
    }
} catch {
    Write-Warning "Permisos S3: Sin verificar"
}

# Verificar límites de servicio
Write-Info "Verificando limites de servicio..."
try {
    $ec2Limit = aws service-quotas get-service-quota --service-code ec2 --quota-code L-1216C47A --region $Region --query 'Quota.Value' --output text 2>$null
    if ($ec2Limit -gt 0) {
        Write-Success "Limite EC2 instances: $ec2Limit"
    }
} catch {
    Write-Warning "No se pudo verificar limites de EC2"
}

# Estimación de costos
Write-Host ""
Write-Host "===========================================" -ForegroundColor Yellow
Write-Host "ESTIMACION DE COSTOS MENSUAL" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Yellow
Write-Host "EC2 t3.small (24/7):     ~$15-20 USD" -ForegroundColor Yellow
Write-Host "RDS db.t3.micro (24/7):  ~$15-20 USD" -ForegroundColor Yellow
Write-Host "S3 Storage (10GB):       ~$2-5 USD" -ForegroundColor Yellow
Write-Host "Transferencia datos:     ~$5-10 USD" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow
Write-Host "TOTAL ESTIMADO:          ~$37-55 USD" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Yellow
Write-Host ""

# Verificar recursos existentes
Write-Info "Verificando recursos existentes en AWS..."

# EC2
try {
    $existingEC2 = aws ec2 describe-instances --filters "Name=tag:Name,Values=chambape-server" "Name=instance-state-name,Values=running,pending,stopping,stopped" --region $Region --query "Reservations[*].Instances[*].{ID:InstanceId,State:State.Name,Type:InstanceType}" --output table 2>$null
    if ($existingEC2 -and $existingEC2.Trim() -and $existingEC2 -notmatch "None") {
        Write-Warning "EC2 instances 'chambape-server' ya existen"
    } else {
        Write-Success "No hay EC2 instances conflictivas"
    }
} catch {
    Write-Success "No hay EC2 instances conflictivas"
}

# RDS
try {
    $existingRDS = aws rds describe-db-instances --db-instance-identifier chambape-db --region $Region --query "DBInstances[0].{ID:DBInstanceIdentifier,Status:DBInstanceStatus,Engine:Engine}" --output table 2>$null
    if ($existingRDS -and $existingRDS.Trim()) {
        Write-Warning "RDS instance 'chambape-db' ya existe"
    } else {
        Write-Success "No hay RDS instances conflictivas"
    }
} catch {
    Write-Success "No hay RDS instances conflictivas"
}

# S3
try {
    aws s3api head-bucket --bucket chambape-storage-prod --region $Region 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Warning "S3 bucket 'chambape-storage-prod' ya existe"
    } else {
        Write-Success "S3 bucket disponible"
    }
} catch {
    Write-Success "S3 bucket disponible"
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "PROXIMOS PASOS" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host "1. Ejecutar: .\deploy-ec2-stack.ps1 -Action create" -ForegroundColor Green
Write-Host "2. Esperar ~15 minutos para RDS" -ForegroundColor Green
Write-Host "3. Ejecutar: .\deploy-ec2-stack.ps1 -Action deploy" -ForegroundColor Green
Write-Host "4. Verificar: .\deploy-ec2-stack.ps1 -Action status" -ForegroundColor Green
Write-Host ""
Write-Host "DOCUMENTACION: Ver GUIA_DEPLOY_EC2_COMPLETA.md" -ForegroundColor Green
Write-Host ""

Write-Success "Verificacion completada!"
