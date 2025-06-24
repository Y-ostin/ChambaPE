#!/bin/bash

# 🚀 ChambaPE AWS Deployment Script con Validación de Trabajadores
# Usage: ./deploy-aws.sh [environment] [region] [deploy-type]
# Example: ./deploy-aws.sh production us-east-1 full
# Deploy types: full, app-only, lambdas-only, infrastructure-only

set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${2:-us-east-1}
DEPLOY_TYPE=${3:-full}
PROJECT_NAME="ChambaPE"
ECR_REPO_NAME="chambape-api"
LAMBDA_FUNCTIONS=("validate-reniec" "validate-sunat" "validate-background")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi
    
    log_success "All prerequisites are met!"
}

# Get AWS account ID
get_account_id() {
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log_info "AWS Account ID: $AWS_ACCOUNT_ID"
}

# Create ECR repository if it doesn't exist
create_ecr_repo() {
    log_info "Creating ECR repository if it doesn't exist..."
    
    if ! aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION &> /dev/null; then
        aws ecr create-repository \
            --repository-name $ECR_REPO_NAME \
            --region $AWS_REGION \
            --image-scanning-configuration scanOnPush=true
        log_success "ECR repository created: $ECR_REPO_NAME"
    else
        log_info "ECR repository already exists: $ECR_REPO_NAME"
    fi
}

# Build and push Docker image
build_and_push_image() {
    log_info "Building and pushing Docker image..."
    
    # Get ECR login token
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Build image
    log_info "Building Docker image..."
    docker build -f Dockerfile.production -t $ECR_REPO_NAME:latest .
    
    # Tag image
    docker tag $ECR_REPO_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:latest
    docker tag $ECR_REPO_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$(date +%Y%m%d-%H%M%S)
    
    # Push images
    log_info "Pushing Docker images to ECR..."
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:latest
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$(date +%Y%m%d-%H%M%S)
    
    log_success "Docker image pushed successfully!"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."
    
    cd infrastructure/
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan \
        -var="environment=$ENVIRONMENT" \
        -var="aws_region=$AWS_REGION" \
        -var="aws_account_id=$AWS_ACCOUNT_ID" \
        -out=tfplan
    
    # Apply deployment
    log_warning "About to deploy infrastructure. This may take several minutes..."
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        terraform apply tfplan
        log_success "Infrastructure deployed successfully!"
    else
        log_warning "Infrastructure deployment cancelled."
        exit 0
    fi
    
    cd ..
}

# Create and store secrets
setup_secrets() {
    log_info "Setting up AWS Secrets Manager..."
    
    # Database credentials
    if ! aws secretsmanager describe-secret --secret-id "ChambaPE/database/credentials" --region $AWS_REGION &> /dev/null; then
        log_info "Creating database credentials secret..."
        DB_PASSWORD=$(openssl rand -base64 32)
        aws secretsmanager create-secret \
            --name "ChambaPE/database/credentials" \
            --description "Database credentials for ChambaPE" \
            --secret-string "{\"username\":\"chambape_admin\",\"password\":\"$DB_PASSWORD\"}" \
            --region $AWS_REGION
        log_success "Database credentials secret created!"
    else
        log_info "Database credentials secret already exists."
    fi
    
    # JWT secrets
    if ! aws secretsmanager describe-secret --secret-id "ChambaPE/jwt/secrets" --region $AWS_REGION &> /dev/null; then
        log_info "Creating JWT secrets..."
        JWT_SECRET=$(openssl rand -base64 64)
        REFRESH_SECRET=$(openssl rand -base64 64)
        aws secretsmanager create-secret \
            --name "ChambaPE/jwt/secrets" \
            --description "JWT secrets for ChambaPE" \
            --secret-string "{\"jwt_secret\":\"$JWT_SECRET\",\"refresh_secret\":\"$REFRESH_SECRET\"}" \
            --region $AWS_REGION
        log_success "JWT secrets created!"
    else
        log_info "JWT secrets already exist."
    fi
    
    # External APIs (RENIEC/SUNAT) - requires manual configuration
    if ! aws secretsmanager describe-secret --secret-id "ChambaPE/external/apis" --region $AWS_REGION &> /dev/null; then
        log_warning "Creating external APIs secret template..."
        aws secretsmanager create-secret \
            --name "ChambaPE/external/apis" \
            --description "External API credentials (RENIEC, SUNAT)" \
            --secret-string "{\"RENIEC_API_URL\":\"REPLACE_WITH_ACTUAL_URL\",\"RENIEC_API_KEY\":\"REPLACE_WITH_ACTUAL_KEY\",\"SUNAT_API_URL\":\"REPLACE_WITH_ACTUAL_URL\",\"SUNAT_API_KEY\":\"REPLACE_WITH_ACTUAL_KEY\"}" \
            --region $AWS_REGION
        log_warning "⚠️  Please update the external APIs secret with actual RENIEC and SUNAT credentials!"
    else
        log_info "External APIs secret already exists."
    fi
}

# Build and deploy Lambda functions for worker validation
deploy_lambda_functions() {
    log_info "🔧 Building and deploying Lambda functions for worker validation..."
    
    # Create build directory
    mkdir -p dist/lambdas
    
    # Build each Lambda function
    for func in "${LAMBDA_FUNCTIONS[@]}"; do
        log_info "📦 Building Lambda function: $func"
        
        lambda_dir="lambda-functions/$func"
        if [ ! -d "$lambda_dir" ]; then
            log_warning "Lambda function directory not found: $lambda_dir"
            continue
        fi
        
        cd "$lambda_dir"
        
        # Install dependencies
        npm install --production --silent
        
        # Create deployment package
        zip_file="../../dist/lambdas/lambda-$func.zip"
        zip -r "$zip_file" . -x "*.git*" "node_modules/.cache/*" "*.test.js" > /dev/null
        
        cd ../..
        
        log_success "✅ Built Lambda function: $func"
    done
    
    # Copy Lambda packages to Terraform directory
    if [ -d "terraform" ]; then
        cp dist/lambdas/*.zip terraform/ 2>/dev/null || true
        log_success "📁 Lambda packages copied to Terraform directory"
    fi
}

# Deploy worker validation infrastructure
deploy_validation_infrastructure() {
    log_info "🏗️ Deploying worker validation infrastructure..."
    
    # Create Secrets Manager secrets for external APIs
    log_info "🔐 Setting up Secrets Manager..."
    
    # RENIEC API Key (placeholder - needs real key)
    aws secretsmanager create-secret \
        --name "chambape/reniec-api-key" \
        --description "API Key for RENIEC validation service" \
        --secret-string "PLACEHOLDER_RENIEC_KEY" \
        --region "$AWS_REGION" 2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id "chambape/reniec-api-key" \
        --secret-string "PLACEHOLDER_RENIEC_KEY" \
        --region "$AWS_REGION"
    
    # SUNAT API Key (placeholder - needs real key)
    aws secretsmanager create-secret \
        --name "chambape/sunat-api-key" \
        --description "API Key for SUNAT validation service" \
        --secret-string "PLACEHOLDER_SUNAT_KEY" \
        --region "$AWS_REGION" 2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id "chambape/sunat-api-key" \
        --secret-string "PLACEHOLDER_SUNAT_KEY" \
        --region "$AWS_REGION"
    
    log_success "✅ Secrets Manager configured"
    
    # Create S3 bucket for worker certificates
    CERTIFICATE_BUCKET="chambape-worker-certificates-$(date +%s)"
    log_info "📁 Creating S3 bucket for certificates: $CERTIFICATE_BUCKET"
    
    aws s3 mb "s3://$CERTIFICATE_BUCKET" --region "$AWS_REGION" || true
    
    # Enable versioning and encryption
    aws s3api put-bucket-versioning \
        --bucket "$CERTIFICATE_BUCKET" \
        --versioning-configuration Status=Enabled
    
    aws s3api put-bucket-encryption \
        --bucket "$CERTIFICATE_BUCKET" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'
    
    log_success "✅ S3 bucket configured: $CERTIFICATE_BUCKET"
    
    # Create SQS queue for worker validation
    log_info "📨 Creating SQS queue for worker validation..."
    
    QUEUE_URL=$(aws sqs create-queue \
        --queue-name "chambape-worker-validation" \
        --attributes '{
            "DelaySeconds": "0",
            "MaxMessageSize": "262144",
            "MessageRetentionPeriod": "1209600",
            "VisibilityTimeoutSeconds": "300"
        }' \
        --region "$AWS_REGION" \
        --query 'QueueUrl' \
        --output text 2>/dev/null || echo "Queue may already exist")
    
    log_success "✅ SQS queue configured"
    
    # Export variables for Terraform
    export TF_VAR_certificate_bucket="$CERTIFICATE_BUCKET"
    export TF_VAR_validation_queue_url="$QUEUE_URL"
    
    log_success "🏗️ Validation infrastructure deployed"
}

# Deploy Lambda functions
deploy_lambda_functions() {
    log_info "Deploying Lambda functions..."
    
    cd lambda/
    
    # Package RENIEC validator
    if [ -d "reniec-validator" ]; then
        cd reniec-validator/
        npm install --production
        zip -r ../reniec-validator.zip .
        cd ..
        
        # Deploy RENIEC validator
        aws lambda create-function \
            --function-name "ChambaPE-RENIEC-Validator" \
            --runtime "nodejs18.x" \
            --role "arn:aws:iam::$AWS_ACCOUNT_ID:role/ChambaPE-Lambda-ExecutionRole" \
            --handler "index.handler" \
            --zip-file "fileb://reniec-validator.zip" \
            --timeout 30 \
            --memory-size 512 \
            --region $AWS_REGION || log_warning "RENIEC Lambda function may already exist"
    fi
    
    # Package SUNAT validator
    if [ -d "sunat-validator" ]; then
        cd sunat-validator/
        npm install --production
        zip -r ../sunat-validator.zip .
        cd ..
        
        # Deploy SUNAT validator
        aws lambda create-function \
            --function-name "ChambaPE-SUNAT-Validator" \
            --runtime "nodejs18.x" \
            --role "arn:aws:iam::$AWS_ACCOUNT_ID:role/ChambaPE-Lambda-ExecutionRole" \
            --handler "index.handler" \
            --zip-file "fileb://sunat-validator.zip" \
            --timeout 30 \
            --memory-size 512 \
            --region $AWS_REGION || log_warning "SUNAT Lambda function may already exist"
    fi
    
    cd ..
    log_success "Lambda functions deployed!"
}

# Deploy ECS service
deploy_ecs_service() {
    log_info "Deploying ECS service..."
    
    # Get task definition ARN
    TASK_DEF_ARN=$(aws ecs list-task-definitions --family-prefix "chambape-api" --status ACTIVE --sort DESC --query 'taskDefinitionArns[0]' --output text --region $AWS_REGION)
    
    if [ "$TASK_DEF_ARN" != "None" ] && [ "$TASK_DEF_ARN" != "" ]; then
        # Update existing service
        aws ecs update-service \
            --cluster "ChambaPE-Cluster" \
            --service "chambape-api" \
            --task-definition "$TASK_DEF_ARN" \
            --force-new-deployment \
            --region $AWS_REGION
        log_success "ECS service updated!"
    else
        log_error "Task definition not found. Please check your infrastructure deployment."
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # This would typically be done through ECS task or Lambda
    log_warning "Please run migrations manually after deployment:"
    echo "1. Connect to ECS task"
    echo "2. Run: npm run migration:run"
    echo "3. Run: npm run seed:run:relational"
}

# Setup monitoring and alerts
setup_monitoring() {
    log_info "Setting up CloudWatch monitoring and alerts..."
    
    # Create CloudWatch dashboard
    aws logs create-log-group --log-group-name "/ecs/chambape-api" --region $AWS_REGION || log_info "Log group already exists"
    
    # Create basic alarms
    aws cloudwatch put-metric-alarm \
        --alarm-name "ChambaPE-High-CPU" \
        --alarm-description "ChambaPE High CPU Usage" \
        --metric-name CPUUtilization \
        --namespace AWS/ECS \
        --statistic Average \
        --period 300 \
        --threshold 80 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --region $AWS_REGION || log_info "CPU alarm already exists"
    
    log_success "Basic monitoring setup completed!"
}

# Print deployment summary
print_summary() {
    log_success "🎉 Deployment completed successfully!"
    echo
    echo "📋 Deployment Summary:"
    echo "├── Environment: $ENVIRONMENT"
    echo "├── Region: $AWS_REGION"
    echo "├── Account ID: $AWS_ACCOUNT_ID"
    echo "└── ECR Repository: $ECR_REPO_NAME"
    echo
    echo "🔗 Next Steps:"
    echo "1. Update external API secrets in AWS Secrets Manager"
    echo "2. Configure Route 53 DNS (if applicable)"
    echo "3. Run database migrations"
    echo "4. Test the API endpoints"
    echo "5. Setup monitoring dashboards"
    echo
    echo "📚 Documentation:"
    echo "├── AWS Migration Plan: docs/aws-migration-plan.md"
    echo "├── Production Config: docs/aws-production-config.md"
    echo "└── Terraform Files: infrastructure/"
    echo
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f lambda/*.zip
    rm -f infrastructure/tfplan
}

# Main deployment flow
main() {
    echo "🚀 ChambaPE AWS Deployment Script with Worker Validation"
    echo "======================================================="
    echo "Environment: $ENVIRONMENT"
    echo "Region: $AWS_REGION"
    echo "Deploy Type: $DEPLOY_TYPE"
    echo
    
    case $DEPLOY_TYPE in
        "full")
            log_info "🏗️ Full deployment: Infrastructure + Application + Worker Validation"
            check_prerequisites
            get_account_id
            deploy_validation_infrastructure
            create_ecr_repo
            build_and_push_image
            deploy_infrastructure
            setup_secrets
            deploy_lambda_functions
            deploy_ecs_service
            setup_monitoring
            monitor_validation_system
            test_validation_flow
            print_summary
            cleanup
            ;;
        "app-only")
            log_info "📱 Application-only deployment"
            check_prerequisites
            get_account_id
            create_ecr_repo
            build_and_push_image
            deploy_ecs_service
            print_summary
            ;;
        "lambdas-only")
            log_info "⚡ Lambda functions-only deployment"
            check_prerequisites
            get_account_id
            deploy_lambda_functions
            test_validation_flow
            ;;
        "infrastructure-only")
            log_info "🏗️ Infrastructure-only deployment"
            check_prerequisites
            get_account_id
            deploy_validation_infrastructure
            deploy_infrastructure
            setup_secrets
            monitor_validation_system
            print_summary
            ;;
        *)
            log_error "Invalid deploy type: $DEPLOY_TYPE"
            log_info "Valid options: full, app-only, lambdas-only, infrastructure-only"
            exit 1
            ;;
    esac
    
    log_success "� ChambaPE deployment completed successfully!"
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"
