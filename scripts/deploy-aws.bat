@echo off
REM 🚀 Script de Deploy para Windows PowerShell

echo 🚀 Iniciando deploy de ChambaPE en AWS...

REM Configuración
set REGION=us-east-2
set CLUSTER_NAME=chambape-cluster
set SERVICE_NAME=chambape-service
set ECR_REPO_NAME=chambape-api

REM Obtener Account ID
for /f "usebackq tokens=*" %%i in (`aws sts get-caller-identity --query Account --output text`) do set ACCOUNT_ID=%%i
set ECR_URI=%ACCOUNT_ID%.dkr.ecr.%REGION%.amazonaws.com/%ECR_REPO_NAME%

echo 📋 Configuración:
echo   - Account ID: %ACCOUNT_ID%
echo   - Region: %REGION%
echo   - ECR URI: %ECR_URI%

REM Verificar conexión AWS
echo 🔐 Verificando conexión AWS...
aws sts get-caller-identity >nul 2>&1
if errorlevel 1 (
    echo ❌ No se puede conectar a AWS. Verifica tus credenciales.
    exit /b 1
)
echo ✅ Conectado a AWS

REM Crear ECR repository si no existe
echo 📦 Verificando repositorio ECR...
aws ecr describe-repositories --repository-names %ECR_REPO_NAME% --region %REGION% >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Repositorio ECR no existe. Creando...
    aws ecr create-repository --repository-name %ECR_REPO_NAME% --region %REGION%
    echo ✅ Repositorio ECR creado
) else (
    echo ✅ Repositorio ECR existe
)

REM Login a ECR
echo 🔑 Autenticando con ECR...
for /f "usebackq tokens=*" %%i in (`aws ecr get-login-password --region %REGION%`) do docker login --username AWS --password-stdin %ECR_URI% <<<"%%i"

REM Construir imagen Docker
echo 🏗️ Construyendo imagen Docker...
docker build -f Dockerfile.aws -t %ECR_REPO_NAME%:latest .

REM Tagear imagen
echo 🏷️ Tageando imagen...
docker tag %ECR_REPO_NAME%:latest %ECR_URI%:latest

REM Subir imagen a ECR
echo 📤 Subiendo imagen a ECR...
docker push %ECR_URI%:latest

echo ✅ Imagen subida exitosamente

REM Actualizar servicio ECS
echo 🔄 Actualizando servicio ECS...
aws ecs update-service --cluster %CLUSTER_NAME% --service %SERVICE_NAME% --force-new-deployment --region %REGION%

REM Obtener URL del Load Balancer
echo 🌐 Obteniendo URL de la aplicación...
for /f "usebackq tokens=*" %%i in (`aws elbv2 describe-load-balancers --names chambape-alb --query "LoadBalancers[0].DNSName" --output text --region %REGION% 2^>nul`) do set ALB_DNS=%%i

echo 🎉 ¡Deploy completado exitosamente!
echo 📊 Información del deploy:
echo   - Imagen: %ECR_URI%:latest
echo   - Cluster: %CLUSTER_NAME%
echo   - Servicio: %SERVICE_NAME%
if defined ALB_DNS (
    echo   - URL: http://%ALB_DNS%
    echo   - API Docs: http://%ALB_DNS%/docs
) else (
    echo   - URL: Configura el Load Balancer para obtener la URL
)

echo 📝 Próximos pasos:
echo   1. Verificar servicio: aws ecs describe-services --cluster %CLUSTER_NAME% --services %SERVICE_NAME%
echo   2. Verificar logs: aws logs tail /ecs/chambape-api --follow
echo   3. Probar API: curl http://%ALB_DNS%/api

pause
