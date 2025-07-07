# 🚀 Script de Deploy Rápido con CDK

# Instalar dependencias
npm install -g aws-cdk

# Crear directorio CDK
New-Item -ItemType Directory -Path "cdk" -Force
Set-Location "cdk"

# Inicializar proyecto CDK
cdk init app --language typescript

# Instalar dependencias AWS CDK
npm install @aws-cdk/aws-ec2 @aws-cdk/aws-ecs @aws-cdk/aws-ecs-patterns @aws-cdk/aws-rds @aws-cdk/aws-s3 @aws-cdk/aws-elasticloadbalancingv2 @aws-cdk/aws-ecr @aws-cdk/aws-secretsmanager @aws-cdk/aws-certificatemanager

Write-Host "📋 Proyecto CDK inicializado" -ForegroundColor Green
Write-Host "📝 Edita el archivo lib/cdk-stack.ts con el código del stack" -ForegroundColor Yellow
Write-Host "🚀 Ejecuta 'cdk deploy' para desplegar" -ForegroundColor Blue

# Volver al directorio raíz
Set-Location ".."
