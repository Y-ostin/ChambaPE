# 🚀 Guía de Deploy Mínimo en AWS para ChambaPE

## 🎯 Resumen Ejecutivo - Deploy en 3 Pasos

### ⚡ Opción Rápida (Recomendada)

```powershell
# 1. Setup completo automático
.\deploy-complete.ps1 -Action full

# 2. Verificar estado
.\deploy-complete.ps1 -Action check

# 3. Ver logs
.\deploy-complete.ps1 -Action logs
```

### 📊 Costo Estimado: $50-100/mes

- **ECS Fargate**: $20-40/mes
- **RDS t3.micro**: $15-25/mes
- **ALB**: $18/mes
- **S3**: $5-10/mes
- **Transferencia**: $5-15/mes

### 🏗️ Servicios Desplegados

- ✅ **API Backend** en ECS Fargate (auto-escalable)
- ✅ **Base de Datos** PostgreSQL en RDS
- ✅ **Load Balancer** con SSL/HTTPS
- ✅ **Almacenamiento** S3 para archivos
- ✅ **Monitoreo** CloudWatch integrado
- ✅ **Seguridad** VPC, Security Groups, IAM

---

## 📋 Arquitectura Mínima Esencial

### Stack de Servicios AWS Requeridos:

1. **ECS Fargate** - Contenedores sin servidor
2. **RDS PostgreSQL** - Base de datos
3. **Application Load Balancer** - Balanceador de carga
4. **S3** - Almacenamiento de archivos
5. **ECR** - Registro de contenedores
6. **Route 53** - DNS (opcional)
7. **Certificate Manager** - SSL gratuito

### Costo Estimado Mensual: $50-100 USD

---

## 🛠️ Opción 1: Deploy Rápido con CDK (Recomendado)

### Prerequisitos:

```powershell
# Instalar AWS CDK
npm install -g aws-cdk

# Verificar instalación
cdk --version

# Configurar AWS CLI
aws configure
```

### Paso 1: Crear el Stack CDK

```typescript
// cdk/lib/chambape-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export class ChambaPeStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'ChambaPeVPC', {
      maxAzs: 2,
      natGateways: 1,
    });

    // RDS Database
    const database = new rds.DatabaseInstance(this, 'ChambaPeDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO,
      ),
      vpc,
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      databaseName: 'chambape',
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: false,
      deletionProtection: true,
    });

    // S3 Bucket
    const bucket = new s3.Bucket(this, 'ChambaPeUploads', {
      bucketName: 'chambape-uploads-prod',
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // ECR Repository
    const repository = new ecr.Repository(this, 'ChambaPeECR', {
      repositoryName: 'chambape-api',
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'ChambaPeCluster', {
      vpc,
      clusterName: 'chambape-cluster',
    });

    // ECS Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'ChambaPeTask', {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    const container = taskDefinition.addContainer('api', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      environment: {
        NODE_ENV: 'production',
        DATABASE_TYPE: 'postgres',
        DATABASE_HOST: database.instanceEndpoint.hostname,
        DATABASE_PORT: '5432',
        DATABASE_NAME: 'chambape',
        AWS_S3_REGION: this.region,
        AWS_S3_BUCKET: bucket.bucketName,
      },
      secrets: {
        DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(
          database.secret!,
          'password',
        ),
        DATABASE_USERNAME: ecs.Secret.fromSecretsManager(
          database.secret!,
          'username',
        ),
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'chambape-api',
      }),
    });

    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    // ECS Service
    const service = new ecs.FargateService(this, 'ChambaPeService', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: false,
    });

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ChambaPeALB', {
      vpc,
      internetFacing: true,
    });

    const listener = alb.addListener('Listener', {
      port: 80,
      open: true,
    });

    listener.addTargets('ECS', {
      port: 80,
      targets: [service],
      healthCheckPath: '/api',
      healthCheckInterval: cdk.Duration.seconds(60),
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: alb.loadBalancerDnsName,
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
    });
  }
}
```

### Paso 2: Configurar CDK

```powershell
# Crear directorio CDK
mkdir cdk
cd cdk

# Inicializar proyecto CDK
cdk init app --language typescript

# Instalar dependencias
npm install @aws-cdk/aws-ec2 @aws-cdk/aws-ecs @aws-cdk/aws-rds @aws-cdk/aws-s3 @aws-cdk/aws-elasticloadbalancingv2 @aws-cdk/aws-ecr
```

### Paso 3: Deploy

```powershell
# Bootstrap CDK (solo primera vez)
cdk bootstrap

# Construir imagen Docker y subirla a ECR
./scripts/deploy-image.sh

# Desplegar stack
cdk deploy
```

---

## 🛠️ Opción 2: Deploy Manual Paso a Paso

### Paso 1: Crear ECR Repository

```powershell
# Crear repositorio
aws ecr create-repository --repository-name chambape-api --region us-east-2

# Obtener login token
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-2.amazonaws.com
```

### Paso 2: Construir y Subir Imagen

```powershell
# Construir imagen
docker build -f Dockerfile.aws -t chambape-api .

# Tagear imagen
docker tag chambape-api:latest 123456789012.dkr.ecr.us-east-2.amazonaws.com/chambape-api:latest

# Subir imagen
docker push 123456789012.dkr.ecr.us-east-2.amazonaws.com/chambape-api:latest
```

### Paso 3: Crear RDS Database

```powershell
# Crear subnet group
aws rds create-db-subnet-group \
    --db-subnet-group-name chambape-subnet-group \
    --db-subnet-group-description "ChambaPE Subnet Group" \
    --subnet-ids subnet-12345678 subnet-87654321

# Crear database instance
aws rds create-db-instance \
    --db-instance-identifier chambape-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username postgres \
    --master-user-password YourSecurePassword123! \
    --allocated-storage 20 \
    --db-name chambape \
    --vpc-security-group-ids sg-12345678 \
    --db-subnet-group-name chambape-subnet-group \
    --backup-retention-period 7 \
    --storage-encrypted
```

### Paso 4: Crear ECS Cluster

```powershell
# Crear cluster
aws ecs create-cluster --cluster-name chambape-cluster

# Crear task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### Paso 5: Crear Load Balancer

```powershell
# Crear ALB
aws elbv2 create-load-balancer \
    --name chambape-alb \
    --subnets subnet-12345678 subnet-87654321 \
    --security-groups sg-12345678

# Crear target group
aws elbv2 create-target-group \
    --name chambape-targets \
    --protocol HTTP \
    --port 3000 \
    --vpc-id vpc-12345678 \
    --health-check-path /api
```

---

## 📁 Scripts de Automatización

### Script de Deploy Completo

```bash
#!/bin/bash
# scripts/deploy-aws.sh

set -e

echo "🚀 Iniciando deploy de ChambaPE en AWS..."

# Variables
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-2"
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/chambape-api"

echo "📦 Construyendo imagen Docker..."
docker build -f Dockerfile.aws -t chambape-api .

echo "🔐 Configurando acceso a ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI

echo "📤 Subiendo imagen a ECR..."
docker tag chambape-api:latest $ECR_URI:latest
docker push $ECR_URI:latest

echo "🔄 Actualizando servicio ECS..."
aws ecs update-service --cluster chambape-cluster --service chambape-service --force-new-deployment

echo "✅ Deploy completado!"
echo "🌐 URL: $(aws elbv2 describe-load-balancers --names chambape-alb --query 'LoadBalancers[0].DNSName' --output text)"
```

### Variables de Entorno para AWS

```bash
# .env.aws
NODE_ENV=production
DATABASE_TYPE=postgres
DATABASE_HOST=chambape-db.xxxxx.us-east-2.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_NAME=chambape
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=YourSecurePassword123!

AWS_S3_REGION=us-east-2
AWS_S3_BUCKET=chambape-uploads-prod
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES=7d

MAIL_HOST=email-smtp.us-east-2.amazonaws.com
MAIL_PORT=587
MAIL_USER=AKIAXXXXXXXXXXXXX
MAIL_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔧 Configuraciones Adicionales

### 1. Configurar Route 53 (Dominio)

```powershell
# Crear hosted zone
aws route53 create-hosted-zone --name chambape.com --caller-reference $(date +%s)

# Crear record set
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch file://dns-record.json
```

### 2. Configurar SSL Certificate

```powershell
# Solicitar certificado
aws acm request-certificate \
    --domain-name api.chambape.com \
    --subject-alternative-names *.chambape.com \
    --validation-method DNS
```

### 3. Configurar Auto Scaling

```json
{
  "ServiceName": "chambape-service",
  "ClusterName": "chambape-cluster",
  "ScalableDimension": "ecs:service:DesiredCount",
  "MinCapacity": 1,
  "MaxCapacity": 10,
  "TargetTrackingScalingPolicies": [
    {
      "TargetValue": 70.0,
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
      }
    }
  ]
}
```

---

## 📊 Monitoreo y Logs

### CloudWatch Logs

- Los logs de la aplicación aparecerán automáticamente en CloudWatch
- Grupo de logs: `/ecs/chambape-api`

### Métricas Importantes

- CPU Utilization
- Memory Utilization
- Request Count
- Response Time
- Error Rate

### Alarmas Recomendadas

```powershell
# Alarma CPU alta
aws cloudwatch put-metric-alarm \
    --alarm-name "ChambaPE-HighCPU" \
    --alarm-description "CPU usage > 80%" \
    --metric-name CPUUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold
```

---

## 🔒 Seguridad

### 1. Security Groups

- **ALB**: Puerto 80, 443 desde 0.0.0.0/0
- **ECS**: Puerto 3000 desde ALB security group
- **RDS**: Puerto 5432 desde ECS security group

### 2. IAM Roles

- **ECS Task Execution Role**: Permisos para ECR, CloudWatch
- **ECS Task Role**: Permisos para S3, SES, etc.

### 3. Secrets Manager

- Almacenar credenciales de base de datos
- Rotar passwords automáticamente

---

## 📝 Checklist de Deploy

- [ ] AWS CLI configurado
- [ ] ECR Repository creado
- [ ] Imagen Docker construida y subida
- [ ] RDS Database creada
- [ ] S3 Bucket configurado
- [ ] ECS Cluster y Service desplegados
- [ ] Load Balancer configurado
- [ ] DNS configurado (opcional)
- [ ] SSL Certificate configurado (opcional)
- [ ] Monitoring y alarmas configuradas
- [ ] Backup strategy implementada

---

## 🆘 Troubleshooting

### Problemas Comunes:

1. **Task no inicia**: Verificar logs en CloudWatch
2. **502 Bad Gateway**: Verificar health check del target group
3. **Database connection**: Verificar security groups y credenciales
4. **Imagen no se encuentra**: Verificar tag y URI de ECR

### Comandos Útiles:

```powershell
# Ver estado del servicio
aws ecs describe-services --cluster chambape-cluster --services chambape-service

# Ver logs
aws logs tail /ecs/chambape-api --follow

# Verificar health checks
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:...
```

---

**¿Prefieres la opción CDK (automatizada) o manual? Te recomiendo CDK para mayor eficiencia y mantenibilidad.**
