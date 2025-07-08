# Guía de Despliegue en AWS - ChambaPE API

Esta guía te ayudará a desplegar tu aplicación NestJS en AWS y conectar tu frontend Flutter.

## 📋 Prerrequisitos

### 1. Herramientas necesarias

- [AWS CLI](https://aws.amazon.com/cli/) instalado y configurado
- [Docker](https://www.docker.com/) instalado y ejecutándose
- [Node.js](https://nodejs.org/) (versión 18 o superior)
- [Git](https://git-scm.com/) para control de versiones

### 2. Cuenta de AWS

- Cuenta de AWS activa
- Permisos de administrador o roles específicos para:
  - ECR (Elastic Container Registry)
  - ECS (Elastic Container Service)
  - VPC (Virtual Private Cloud)
  - ELB (Elastic Load Balancer)
  - IAM (Identity and Access Management)

## 🚀 Despliegue Automatizado

### Paso 1: Preparar el entorno

```bash
# Clonar el repositorio
git clone <tu-repositorio>
cd nestjs-boilerplate

# Instalar dependencias
npm install

# Construir la aplicación
npm run build
```

### Paso 2: Configurar variables de entorno

```bash
# Copiar el archivo de configuración para AWS
cp env-example-aws .env

# Editar las variables de entorno
nano .env
```

**Variables importantes a configurar:**

```env
# Configuración de la aplicación
NODE_ENV=production
APP_PORT=3000
APP_NAME="ChambaPE API"
FRONTEND_DOMAIN=https://your-flutter-app-domain.com
BACKEND_DOMAIN=https://your-api-domain.com

# Base de datos PostgreSQL (AWS RDS)
DATABASE_HOST=your-rds-endpoint.region.rds.amazonaws.com
DATABASE_USERNAME=chambape_user
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=chambape_db

# AWS S3 para archivos
ACCESS_KEY_ID=your_aws_access_key_id
SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_REGION=us-east-1
AWS_DEFAULT_S3_BUCKET=chambape-uploads

# JWT Secrets (generar nuevos para producción)
AUTH_JWT_SECRET=your_super_secure_jwt_secret_key_here
AUTH_REFRESH_SECRET=your_super_secure_refresh_secret_key_here
```

### Paso 3: Ejecutar el script de despliegue

```bash
# Dar permisos de ejecución al script
chmod +x deploy-aws.sh

# Ejecutar el despliegue
./deploy-aws.sh
```

El script automatizará:

- ✅ Creación del repositorio ECR
- ✅ Construcción y subida de la imagen Docker
- ✅ Creación de la infraestructura VPC
- ✅ Configuración del cluster ECS
- ✅ Despliegue del Application Load Balancer
- ✅ Creación del servicio ECS

## 🔧 Configuración Manual (Alternativa)

Si prefieres configurar manualmente:

### 1. Crear ECR Repository

```bash
aws ecr create-repository \
    --repository-name chambape-api \
    --region us-east-1 \
    --image-scanning-configuration scanOnPush=true
```

### 2. Construir y subir imagen

```bash
# Obtener token de login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Construir imagen
docker build -f Dockerfile.aws -t chambape-api .

# Etiquetar imagen
docker tag chambape-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/chambape-api:latest

# Subir imagen
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/chambape-api:latest
```

### 3. Crear ECS Cluster

```bash
aws ecs create-cluster \
    --cluster-name chambape-cluster \
    --capacity-providers FARGATE \
    --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
```

### 4. Crear Task Definition

```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### 5. Crear Load Balancer

```bash
# Crear ALB
aws elbv2 create-load-balancer \
    --name chambape-alb \
    --subnets subnet-xxxxx subnet-yyyyy \
    --security-groups sg-xxxxx

# Crear Target Group
aws elbv2 create-target-group \
    --name chambape-tg \
    --protocol HTTP \
    --port 3000 \
    --vpc-id vpc-xxxxx \
    --target-type ip
```

## 🔗 Conectar Flutter con NestJS

### 1. Actualizar configuración de Flutter

En tu aplicación Flutter, actualiza el archivo `lib/config/api_config.dart`:

```dart
class ApiConfig {
  // Para desarrollo local
  static const String _devApiUrl = 'http://localhost:3000/api';

  // Para producción (reemplaza con tu dominio real)
  static const String _prodApiUrl = 'https://your-api-domain.com/api';

  static String get baseUrl {
    const environment = String.fromEnvironment('ENVIRONMENT', defaultValue: 'dev');

    switch (environment) {
      case 'production':
        return _prodApiUrl;
      default:
        return _devApiUrl;
    }
  }
}
```

### 2. Build para producción

```bash
# Para desarrollo
flutter build apk --dart-define=ENVIRONMENT=development

# Para producción
flutter build apk --dart-define=ENVIRONMENT=production
```

### 3. Integrar con el provider

```dart
// En tu main.dart
void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (context) => AuthProvider()),
        ChangeNotifierProxyProvider<AuthProvider, NestJSProvider>(
          create: (context) => NestJSProvider(context.read<AuthProvider>()),
          update: (context, auth, previous) =>
            previous ?? NestJSProvider(auth),
        ),
      ],
      child: MyApp(),
    ),
  );
}
```

## 🔒 Seguridad y Configuración

### 1. Configurar HTTPS

```bash
# Solicitar certificado SSL
aws acm request-certificate \
    --domain-name your-api-domain.com \
    --validation-method DNS \
    --region us-east-1

# Configurar listener HTTPS en ALB
aws elbv2 create-listener \
    --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:account:loadbalancer/app/chambape-alb/xxx \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=arn:aws:acm:us-east-1:account:certificate/xxx \
    --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:account:targetgroup/chambape-tg/xxx
```

### 2. Configurar WAF (Web Application Firewall)

```bash
# Crear WAF Web ACL
aws wafv2 create-web-acl \
    --name chambape-waf \
    --scope REGIONAL \
    --default-action Allow={} \
    --region us-east-1
```

### 3. Configurar CloudWatch Logs

```bash
# Crear log group
aws logs create-log-group --log-group-name /aws/ecs/chambape-api

# Configurar retención de logs
aws logs put-retention-policy \
    --log-group-name /aws/ecs/chambape-api \
    --retention-in-days 30
```

## 📊 Monitoreo y Logs

### 1. CloudWatch Dashboard

```bash
# Crear dashboard
aws cloudwatch put-dashboard \
    --dashboard-name ChambaPE-Monitoring \
    --dashboard-body file://dashboard.json
```

### 2. Configurar alertas

```bash
# Crear alarmas para CPU y memoria
aws cloudwatch put-metric-alarm \
    --alarm-name chambape-cpu-alarm \
    --alarm-description "CPU usage high" \
    --metric-name CPUUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold
```

## 🔄 CI/CD Pipeline

### 1. GitHub Actions

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push image to Amazon ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: chambape-api
          IMAGE_TAG: latest
        run: |
          docker build -f Dockerfile.aws -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: Update ECS service
        run: |
          aws ecs update-service --cluster chambape-cluster --service chambape-api-service --force-new-deployment
```

## 🧪 Testing

### 1. Probar la API

```bash
# Probar endpoint de salud
curl https://your-api-domain.com/health

# Probar autenticación
curl -X POST https://your-api-domain.com/api/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 2. Probar desde Flutter

```dart
// En tu aplicación Flutter
final nestJSProvider = context.read<NestJSProvider>();

// Probar conexión
final isConnected = await nestJSProvider.testConnection();
print('Conectado a NestJS: $isConnected');

// Probar autenticación
try {
  final response = await nestJSProvider.authenticateWithNestJS(
    'test@example.com',
    'password',
  );
  print('Autenticación exitosa: $response');
} catch (e) {
  print('Error de autenticación: $e');
}
```

## 🚨 Troubleshooting

### Problemas comunes:

1. **Error de CORS**

   - Verificar configuración CORS en `main.ts`
   - Asegurar que el dominio de Flutter esté en la lista de orígenes permitidos

2. **Error de conexión a la base de datos**

   - Verificar configuración de RDS
   - Asegurar que el security group permita conexiones desde ECS

3. **Error de autenticación**

   - Verificar configuración de JWT secrets
   - Asegurar que los tokens se estén enviando correctamente

4. **Error de carga de imagen**
   - Verificar permisos de ECR
   - Asegurar que la imagen se haya subido correctamente

## 📞 Soporte

Para obtener ayuda:

1. Revisar los logs de CloudWatch
2. Verificar la documentación de AWS
3. Consultar los logs de la aplicación en ECS

## 🔄 Actualizaciones

Para actualizar la aplicación:

```bash
# Reconstruir y subir nueva imagen
docker build -f Dockerfile.aws -t chambape-api .
docker tag chambape-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/chambape-api:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/chambape-api:latest

# Forzar nuevo despliegue
aws ecs update-service \
    --cluster chambape-cluster \
    --service chambape-api-service \
    --force-new-deployment
```

---

¡Tu aplicación ChambaPE está lista para producción en AWS! 🎉
