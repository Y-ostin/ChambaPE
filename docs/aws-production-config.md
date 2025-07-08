# 🔧 ChambaPE AWS Production Environment Configuration con Validación de Trabajadores

## 📋 Environment Variables for Production con Worker Validation

```env
# ========================================
# PRODUCCIÓN AWS CONFIGURATION
# ========================================
NODE_ENV=production
APP_PORT=3000
APP_NAME="ChambaPE API"
API_PREFIX=api/v1
APP_FALLBACK_LANGUAGE=es
APP_HEADER_LANGUAGE=x-custom-lang

# ========================================
# AWS DOMAINS & ENDPOINTS
# ========================================
FRONTEND_DOMAIN=https://app.chambape.com
BACKEND_DOMAIN=https://api.chambape.com
CDN_DOMAIN=https://cdn.chambape.com

# ========================================
# AWS RDS POSTGRESQL
# ========================================
DATABASE_TYPE=postgres
DATABASE_HOST=${RDS_ENDPOINT}
DATABASE_PORT=5432
DATABASE_USERNAME=${DB_USERNAME}
DATABASE_PASSWORD=${DB_PASSWORD}  # From AWS Secrets Manager
DATABASE_NAME=chambape_prod
DATABASE_SYNCHRONIZE=false
DATABASE_MAX_CONNECTIONS=50
DATABASE_SSL_ENABLED=true
DATABASE_REJECT_UNAUTHORIZED=false

# ========================================
# AWS ELASTICACHE REDIS
# ========================================
REDIS_HOST=${REDIS_ENDPOINT}
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}  # If AUTH enabled
REDIS_DB=0

# ========================================
# JWT CONFIGURATION (AWS Secrets Manager)
# ========================================
AUTH_JWT_SECRET=${JWT_SECRET}      # From AWS Secrets Manager
AUTH_JWT_TOKEN_EXPIRES_IN=15m
AUTH_REFRESH_SECRET=${REFRESH_SECRET}  # From AWS Secrets Manager
AUTH_REFRESH_TOKEN_EXPIRES_IN=7d

# ========================================
# AWS SES (EMAIL SERVICE)
# ========================================
MAIL_HOST=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USER=${SES_SMTP_USERNAME}     # From AWS Secrets Manager
MAIL_PASSWORD=${SES_SMTP_PASSWORD} # From AWS Secrets Manager
MAIL_DEFAULT_EMAIL=noreply@chambape.com
MAIL_DEFAULT_NAME="ChambaPE"
MAIL_SECURE=true
MAIL_REQUIRE_TLS=true

# ========================================
# AWS S3 FILE STORAGE
# ========================================
FILE_DRIVER=s3
AWS_S3_REGION=us-east-1
AWS_DEFAULT_S3_BUCKET=chambape-files-prod
AWS_S3_BUCKET_PUBLIC=chambape-public-assets
ACCESS_KEY_ID=${S3_ACCESS_KEY}     # From AWS Secrets Manager
SECRET_ACCESS_KEY=${S3_SECRET_KEY} # From AWS Secrets Manager

# ========================================
# VALIDACIONES RENIEC/SUNAT
# ========================================
RENIEC_API_URL=${RENIEC_API_URL}           # From AWS Secrets Manager
RENIEC_API_KEY=${RENIEC_API_KEY}           # From AWS Secrets Manager
SUNAT_API_URL=${SUNAT_API_URL}             # From AWS Secrets Manager
SUNAT_API_KEY=${SUNAT_API_KEY}             # From AWS Secrets Manager
VALIDATION_QUEUE_URL=${SQS_VALIDATION_URL} # From Terraform output
STEP_FUNCTION_ARN=${STEP_FUNCTION_ARN}     # From Terraform output

# ========================================
# AWS CLOUDWATCH LOGGING
# ========================================
LOG_LEVEL=info
CLOUDWATCH_LOG_GROUP=/ecs/chambape-api
CLOUDWATCH_LOG_STREAM=${ECS_TASK_ID}

# ========================================
# PERFORMANCE & SCALING
# ========================================
MAX_CONNECTIONS=100
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=1000
CORS_ORIGIN=https://app.chambape.com

# ========================================
# MONITORING & HEALTH CHECKS
# ========================================
HEALTH_CHECK_ENDPOINT=/api/v1/health
METRICS_ENABLED=true
PROMETHEUS_METRICS=true
NEW_RELIC_LICENSE_KEY=${NEW_RELIC_KEY}  # Optional

# ========================================
# SOCIAL LOGINS (PRODUCTION)
# ========================================
FACEBOOK_APP_ID=${FACEBOOK_APP_ID}       # From AWS Secrets Manager
FACEBOOK_APP_SECRET=${FACEBOOK_SECRET}   # From AWS Secrets Manager
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}     # From AWS Secrets Manager
GOOGLE_CLIENT_SECRET=${GOOGLE_SECRET}    # From AWS Secrets Manager

# ========================================
# WORKER VALIDATION CONFIGURATION 🆕
# ========================================
WORKER_VALIDATION_ENABLED=true
WORKER_VALIDATION_FLOW_TYPE=step-functions  # step-functions | lambda-direct

# External APIs for Worker Validation
RENIEC_API_URL=https://api.reniec.gob.pe/v1
RENIEC_API_KEY=${RENIEC_API_KEY}  # From AWS Secrets Manager
RENIEC_TIMEOUT=30000
RENIEC_RETRY_ATTEMPTS=3

SUNAT_API_URL=https://api.sunat.gob.pe/v1
SUNAT_API_KEY=${SUNAT_API_KEY}  # From AWS Secrets Manager
SUNAT_TIMEOUT=30000
SUNAT_RETRY_ATTEMPTS=3

# AWS Lambda Functions for Validation
LAMBDA_VALIDATE_RENIEC_ARN=arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:chambape-validate-reniec
LAMBDA_VALIDATE_SUNAT_ARN=arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:chambape-validate-sunat
LAMBDA_VALIDATE_BACKGROUND_ARN=arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:chambape-validate-background

# Step Functions for Orchestration
STEP_FUNCTION_WORKER_VALIDATION_ARN=arn:aws:states:${AWS_REGION}:${AWS_ACCOUNT_ID}:stateMachine:chambape-worker-validation

# SQS Queues for Async Processing
SQS_WORKER_VALIDATION_URL=https://sqs.${AWS_REGION}.amazonaws.com/${AWS_ACCOUNT_ID}/chambape-worker-validation
SQS_WORKER_VALIDATION_DLQ_URL=https://sqs.${AWS_REGION}.amazonaws.com/${AWS_ACCOUNT_ID}/chambape-worker-validation-dlq

# S3 for Certificate Storage
S3_BUCKET_CERTIFICATES=chambape-worker-certificates-${ENVIRONMENT}
S3_BUCKET_REGION=${AWS_REGION}

# Validation Rules
VALIDATION_MIN_CONFIDENCE_SCORE=80
VALIDATION_REQUIRE_CLEAN_BACKGROUND=true
VALIDATION_ALLOW_PENDING_DOCUMENTS=false
VALIDATION_MAX_PROCESSING_TIME=300  # 5 minutes

# Notification Configuration for Validation Results
NOTIFICATION_WORKER_APPROVED_TEMPLATE=worker-approved
NOTIFICATION_WORKER_REJECTED_TEMPLATE=worker-rejected
NOTIFICATION_WORKER_PENDING_TEMPLATE=worker-pending-review
```

## Production Docker Configuration

### Dockerfile.production

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install production dependencies
RUN apk add --no-cache curl

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Start application
CMD ["node", "dist/main"]
```

## AWS ECS Task Definition

### task-definition.json

```json
{
  "family": "chambape-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ChambaPE-ECS-ExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ChambaPE-ECS-TaskRole",
  "containerDefinitions": [
    {
      "name": "chambape-api",
      "image": "ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/chambape-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/chambape-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "APP_PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_HOST",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:ChambaPE/database/host"
        },
        {
          "name": "DATABASE_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:ChambaPE/database/password"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:ChambaPE/jwt/secret"
        },
        {
          "name": "RENIEC_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:ChambaPE/external/reniec-key"
        },
        {
          "name": "SUNAT_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:ChambaPE/external/sunat-key"
        }
      ],
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/api/v1/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

## Lambda Functions for Validations

### RENIEC Validation Function

```javascript
// lambda/reniec-validator/index.js
const AWS = require('aws-sdk');
const axios = require('axios');

const secretsManager = new AWS.SecretsManager();
const sqs = new AWS.SQS();

exports.handler = async (event) => {
  try {
    const { dni, nombres, apellidos } = event;

    // Get RENIEC credentials from Secrets Manager
    const secret = await secretsManager
      .getSecretValue({
        SecretId: 'ChambaPE/external/apis',
      })
      .promise();

    const credentials = JSON.parse(secret.SecretString);

    // Validate identity with RENIEC
    const response = await axios.post(
      credentials.RENIEC_API_URL,
      {
        dni,
        nombres,
        apellidos,
      },
      {
        headers: {
          Authorization: `Bearer ${credentials.RENIEC_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    const isValid =
      response.data.estado === 'ACTIVO' &&
      response.data.nombres === nombres &&
      response.data.apellidos === apellidos;

    // Send result to SQS for processing
    await sqs
      .sendMessage({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageBody: JSON.stringify({
          type: 'RENIEC_VALIDATION',
          dni,
          valid: isValid,
          details: response.data,
          timestamp: new Date().toISOString(),
        }),
      })
      .promise();

    return {
      statusCode: 200,
      body: {
        identityValid: isValid,
        details: response.data,
      },
    };
  } catch (error) {
    console.error('RENIEC Validation Error:', error);

    return {
      statusCode: 500,
      body: {
        identityValid: false,
        error: error.message,
      },
    };
  }
};
```

### SUNAT Validation Function

```javascript
// lambda/sunat-validator/index.js
const AWS = require('aws-sdk');
const axios = require('axios');

const secretsManager = new AWS.SecretsManager();
const sqs = new AWS.SQS();

exports.handler = async (event) => {
  try {
    const { ruc, certificadoUnicoLaboral } = event;

    // Get SUNAT credentials from Secrets Manager
    const secret = await secretsManager
      .getSecretValue({
        SecretId: 'ChambaPE/external/apis',
      })
      .promise();

    const credentials = JSON.parse(secret.SecretString);

    // Validate worker status with SUNAT
    const response = await axios.post(
      credentials.SUNAT_API_URL,
      {
        ruc,
        certificado: certificadoUnicoLaboral,
      },
      {
        headers: {
          Authorization: `Bearer ${credentials.SUNAT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    const isValid =
      response.data.estado === 'ACTIVO' &&
      response.data.tieneAntecedentes === false &&
      response.data.trabajadorFormal === true;

    // Send result to SQS for processing
    await sqs
      .sendMessage({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageBody: JSON.stringify({
          type: 'SUNAT_VALIDATION',
          ruc,
          valid: isValid,
          details: response.data,
          timestamp: new Date().toISOString(),
        }),
      })
      .promise();

    return {
      statusCode: 200,
      body: {
        sunatValid: isValid,
        details: response.data,
      },
    };
  } catch (error) {
    console.error('SUNAT Validation Error:', error);

    return {
      statusCode: 500,
      body: {
        sunatValid: false,
        error: error.message,
      },
    };
  }
};
```

## Application Load Balancer Configuration

### ALB with SSL/TLS

```terraform
# alb.tf
resource "aws_lb" "chambape_alb" {
  name               = "ChambaPE-ALB"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public_subnets[*].id

  enable_deletion_protection = true

  tags = {
    Name = "ChambaPE-ALB"
    Environment = "production"
  }
}

resource "aws_lb_target_group" "chambape_tg" {
  name        = "ChambaPE-TG"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.chambape_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/api/v1/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "ChambaPE-TargetGroup"
    Environment = "production"
  }
}

resource "aws_lb_listener" "chambape_https" {
  load_balancer_arn = aws_lb.chambape_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.chambape_cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.chambape_tg.arn
  }
}

# Redirect HTTP to HTTPS
resource "aws_lb_listener" "chambape_http_redirect" {
  load_balancer_arn = aws_lb.chambape_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

## CloudFormation Outputs for Reference

```yaml
# outputs.yml
Outputs:
  LoadBalancerDNS:
    Description: 'Application Load Balancer DNS'
    Value: !GetAtt ApplicationLoadBalancer.DNSName
    Export:
      Name: !Sub '${AWS::StackName}-ALB-DNS'

  DatabaseEndpoint:
    Description: 'RDS PostgreSQL Endpoint'
    Value: !GetAtt Database.Endpoint.Address
    Export:
      Name: !Sub '${AWS::StackName}-DB-Endpoint'

  RedisEndpoint:
    Description: 'ElastiCache Redis Endpoint'
    Value: !GetAtt RedisCluster.RedisEndpoint.Address
    Export:
      Name: !Sub '${AWS::StackName}-Redis-Endpoint'

  ValidationQueueURL:
    Description: 'SQS Validation Queue URL'
    Value: !Ref ValidationQueue
    Export:
      Name: !Sub '${AWS::StackName}-Validation-Queue'

  StepFunctionArn:
    Description: 'Step Function for Worker Validation'
    Value: !Ref WorkerValidationStateMachine
    Export:
      Name: !Sub '${AWS::StackName}-StepFunction-ARN'
```
