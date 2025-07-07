#!/bin/bash
# 🛠️ Script de configuración inicial para AWS

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛠️ Configurando infraestructura inicial en AWS...${NC}"

REGION="us-east-2"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo -e "${YELLOW}📋 Información de la cuenta:${NC}"
echo "  - Account ID: $ACCOUNT_ID"
echo "  - Region: $REGION"

# 1. Crear roles IAM necesarios
echo -e "${BLUE}🔐 Creando roles IAM...${NC}"

# ECS Task Execution Role
if ! aws iam get-role --role-name ecsTaskExecutionRole > /dev/null 2>&1; then
    echo "Creando ecsTaskExecutionRole..."
    aws iam create-role \
        --role-name ecsTaskExecutionRole \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": "ecs-tasks.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                }
            ]
        }'
    
    aws iam attach-role-policy \
        --role-name ecsTaskExecutionRole \
        --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
fi

# ECS Task Role
if ! aws iam get-role --role-name ecsTaskRole > /dev/null 2>&1; then
    echo "Creando ecsTaskRole..."
    aws iam create-role \
        --role-name ecsTaskRole \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": "ecs-tasks.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                }
            ]
        }'
    
    # Crear política personalizada para S3 y SES
    aws iam put-role-policy \
        --role-name ecsTaskRole \
        --policy-name ChambaPeTaskPolicy \
        --policy-document '{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:GetObject",
                        "s3:PutObject",
                        "s3:DeleteObject"
                    ],
                    "Resource": "arn:aws:s3:::chambape-uploads-prod/*"
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "ses:SendEmail",
                        "ses:SendRawEmail"
                    ],
                    "Resource": "*"
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "secretsmanager:GetSecretValue"
                    ],
                    "Resource": "arn:aws:secretsmanager:'$REGION':'$ACCOUNT_ID':secret:chambape-*"
                }
            ]
        }'
fi

echo -e "${GREEN}✅ Roles IAM configurados${NC}"

# 2. Crear VPC y componentes de red
echo -e "${BLUE}🌐 Configurando VPC...${NC}"

# Crear VPC
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=ChambaPE-VPC}]' \
    --query 'Vpc.VpcId' \
    --output text 2>/dev/null || aws ec2 describe-vpcs --filters "Name=tag:Name,Values=ChambaPE-VPC" --query 'Vpcs[0].VpcId' --output text)

echo "VPC ID: $VPC_ID"

# Habilitar DNS
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support

# Crear Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
    --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=ChambaPE-IGW}]' \
    --query 'InternetGateway.InternetGatewayId' \
    --output text 2>/dev/null || aws ec2 describe-internet-gateways --filters "Name=tag:Name,Values=ChambaPE-IGW" --query 'InternetGateways[0].InternetGatewayId' --output text)

# Adjuntar IGW a VPC
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID 2>/dev/null || true

# Crear subnets públicas
PUBLIC_SUBNET_1=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.1.0/24 \
    --availability-zone ${REGION}a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=ChambaPE-Public-1}]' \
    --query 'Subnet.SubnetId' \
    --output text 2>/dev/null || aws ec2 describe-subnets --filters "Name=tag:Name,Values=ChambaPE-Public-1" --query 'Subnets[0].SubnetId' --output text)

PUBLIC_SUBNET_2=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.2.0/24 \
    --availability-zone ${REGION}b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=ChambaPE-Public-2}]' \
    --query 'Subnet.SubnetId' \
    --output text 2>/dev/null || aws ec2 describe-subnets --filters "Name=tag:Name,Values=ChambaPE-Public-2" --query 'Subnets[0].SubnetId' --output text)

# Crear subnets privadas
PRIVATE_SUBNET_1=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.3.0/24 \
    --availability-zone ${REGION}a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=ChambaPE-Private-1}]' \
    --query 'Subnet.SubnetId' \
    --output text 2>/dev/null || aws ec2 describe-subnets --filters "Name=tag:Name,Values=ChambaPE-Private-1" --query 'Subnets[0].SubnetId' --output text)

PRIVATE_SUBNET_2=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.4.0/24 \
    --availability-zone ${REGION}b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=ChambaPE-Private-2}]' \
    --query 'Subnet.SubnetId' \
    --output text 2>/dev/null || aws ec2 describe-subnets --filters "Name=tag:Name,Values=ChambaPE-Private-2" --query 'Subnets[0].SubnetId' --output text)

echo "Subnets creadas:"
echo "  - Públicas: $PUBLIC_SUBNET_1, $PUBLIC_SUBNET_2"
echo "  - Privadas: $PRIVATE_SUBNET_1, $PRIVATE_SUBNET_2"

# 3. Crear Security Groups
echo -e "${BLUE}🛡️ Configurando Security Groups...${NC}"

# ALB Security Group
ALB_SG=$(aws ec2 create-security-group \
    --group-name chambape-alb-sg \
    --description "Security group for ChambaPE ALB" \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=ChambaPE-ALB-SG}]' \
    --query 'GroupId' \
    --output text 2>/dev/null || aws ec2 describe-security-groups --filters "Name=group-name,Values=chambape-alb-sg" --query 'SecurityGroups[0].GroupId' --output text)

# ECS Security Group
ECS_SG=$(aws ec2 create-security-group \
    --group-name chambape-ecs-sg \
    --description "Security group for ChambaPE ECS" \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=ChambaPE-ECS-SG}]' \
    --query 'GroupId' \
    --output text 2>/dev/null || aws ec2 describe-security-groups --filters "Name=group-name,Values=chambape-ecs-sg" --query 'SecurityGroups[0].GroupId' --output text)

# RDS Security Group
RDS_SG=$(aws ec2 create-security-group \
    --group-name chambape-rds-sg \
    --description "Security group for ChambaPE RDS" \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=ChambaPE-RDS-SG}]' \
    --query 'GroupId' \
    --output text 2>/dev/null || aws ec2 describe-security-groups --filters "Name=group-name,Values=chambape-rds-sg" --query 'SecurityGroups[0].GroupId' --output text)

echo "Security Groups:"
echo "  - ALB: $ALB_SG"
echo "  - ECS: $ECS_SG"
echo "  - RDS: $RDS_SG"

# Configurar reglas de Security Groups
echo -e "${BLUE}🔧 Configurando reglas de Security Groups...${NC}"

# ALB: permitir HTTP y HTTPS
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 80 --cidr 0.0.0.0/0 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 443 --cidr 0.0.0.0/0 2>/dev/null || true

# ECS: permitir tráfico desde ALB
aws ec2 authorize-security-group-ingress --group-id $ECS_SG --protocol tcp --port 3000 --source-group $ALB_SG 2>/dev/null || true

# RDS: permitir tráfico desde ECS
aws ec2 authorize-security-group-ingress --group-id $RDS_SG --protocol tcp --port 5432 --source-group $ECS_SG 2>/dev/null || true

# 4. Crear S3 Bucket
echo -e "${BLUE}📦 Configurando S3 Bucket...${NC}"

aws s3 mb s3://chambape-uploads-prod --region $REGION 2>/dev/null || echo "Bucket ya existe"

# Configurar política del bucket
aws s3api put-bucket-policy \
    --bucket chambape-uploads-prod \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowECSAccess",
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::'$ACCOUNT_ID':role/ecsTaskRole"
                },
                "Action": [
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:DeleteObject"
                ],
                "Resource": "arn:aws:s3:::chambape-uploads-prod/*"
            }
        ]
    }' 2>/dev/null || true

# 5. Crear RDS Subnet Group
echo -e "${BLUE}🗄️ Configurando RDS Subnet Group...${NC}"

aws rds create-db-subnet-group \
    --db-subnet-group-name chambape-subnet-group \
    --db-subnet-group-description "ChambaPE Database Subnet Group" \
    --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2 \
    --tags 'Key=Name,Value=ChambaPE-DB-Subnet-Group' 2>/dev/null || echo "Subnet group ya existe"

# 6. Crear CloudWatch Log Group
echo -e "${BLUE}📊 Configurando CloudWatch Log Group...${NC}"

aws logs create-log-group --log-group-name /ecs/chambape-api --region $REGION 2>/dev/null || echo "Log group ya existe"

# 7. Crear ECS Cluster
echo -e "${BLUE}🚀 Configurando ECS Cluster...${NC}"

aws ecs create-cluster --cluster-name chambape-cluster --capacity-providers FARGATE --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 2>/dev/null || echo "Cluster ya existe"

echo -e "${GREEN}✅ Configuración inicial completada${NC}"

echo -e "${YELLOW}📋 Resumen de recursos creados:${NC}"
echo "  - VPC: $VPC_ID"
echo "  - Subnets públicas: $PUBLIC_SUBNET_1, $PUBLIC_SUBNET_2"
echo "  - Subnets privadas: $PRIVATE_SUBNET_1, $PRIVATE_SUBNET_2"
echo "  - Security Groups: ALB=$ALB_SG, ECS=$ECS_SG, RDS=$RDS_SG"
echo "  - S3 Bucket: chambape-uploads-prod"
echo "  - ECS Cluster: chambape-cluster"
echo "  - Log Group: /ecs/chambape-api"

echo -e "${BLUE}📝 Próximos pasos:${NC}"
echo "  1. Crear RDS Database con: aws rds create-db-instance"
echo "  2. Crear ALB con target groups"
echo "  3. Actualizar task-definition.json con los ARNs de roles"
echo "  4. Ejecutar deploy-aws.sh"

# Guardar variables en archivo
cat > aws-resources.env << EOF
VPC_ID=$VPC_ID
PUBLIC_SUBNET_1=$PUBLIC_SUBNET_1
PUBLIC_SUBNET_2=$PUBLIC_SUBNET_2
PRIVATE_SUBNET_1=$PRIVATE_SUBNET_1
PRIVATE_SUBNET_2=$PRIVATE_SUBNET_2
ALB_SG=$ALB_SG
ECS_SG=$ECS_SG
RDS_SG=$RDS_SG
ACCOUNT_ID=$ACCOUNT_ID
REGION=$REGION
EOF

echo -e "${GREEN}💾 Variables guardadas en aws-resources.env${NC}"
