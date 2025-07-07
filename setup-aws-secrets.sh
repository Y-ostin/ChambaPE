#!/bin/bash

# 🔐 ChambaPE AWS Secrets Setup Script
# Este script configura todos los secretos necesarios en AWS Secrets Manager

set -e

# Configuration
AWS_REGION=${1:-us-east-2}
ENVIRONMENT=${2:-production}

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

# Function to generate secure random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Function to generate JWT secret
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d "=+/"
}

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    if aws secretsmanager describe-secret --secret-id "$secret_name" --region "$AWS_REGION" &> /dev/null; then
        log_warning "Secret $secret_name already exists. Updating..."
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION" > /dev/null
    else
        log_info "Creating secret: $secret_name"
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "$description" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION" > /dev/null
    fi
    log_success "✅ Secret $secret_name configured"
}

echo "🔐 Setting up AWS Secrets Manager for ChambaPE"
echo "=================================================="
echo "Region: $AWS_REGION"
echo "Environment: $ENVIRONMENT"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

log_info "AWS Account: $(aws sts get-caller-identity --query Account --output text)"
echo ""

# 1. Database Credentials
log_info "🗄️ Setting up database credentials..."
DB_PASSWORD=$(generate_password)
DB_CREDENTIALS="{
    \"host\": \"REPLACE_WITH_RDS_ENDPOINT\",
    \"username\": \"chambape_admin\",
    \"password\": \"$DB_PASSWORD\",
    \"database\": \"chambape_db\",
    \"port\": \"5432\"
}"

create_or_update_secret \
    "ChambaPE/database/credentials" \
    "$DB_CREDENTIALS" \
    "Database credentials for ChambaPE $ENVIRONMENT environment"

echo ""

# 2. JWT Secrets
log_info "🔑 Setting up JWT secrets..."
JWT_SECRET=$(generate_jwt_secret)
REFRESH_SECRET=$(generate_jwt_secret)
FORGOT_SECRET=$(generate_jwt_secret)
CONFIRM_EMAIL_SECRET=$(generate_jwt_secret)

JWT_SECRETS="{
    \"jwt_secret\": \"$JWT_SECRET\",
    \"refresh_secret\": \"$REFRESH_SECRET\",
    \"forgot_secret\": \"$FORGOT_SECRET\",
    \"confirm_email_secret\": \"$CONFIRM_EMAIL_SECRET\"
}"

create_or_update_secret \
    "ChambaPE/jwt/secrets" \
    "$JWT_SECRETS" \
    "JWT secrets for ChambaPE authentication"

echo ""

# 3. AWS Service Credentials
log_info "☁️ Setting up AWS service credentials..."
read -p "Enter AWS Access Key ID for S3/SES: " AWS_ACCESS_KEY_ID
read -sp "Enter AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
echo ""
read -p "Enter S3 bucket name [chambape-uploads-prod]: " S3_BUCKET
S3_BUCKET=${S3_BUCKET:-chambape-uploads-prod}

AWS_CREDENTIALS="{
    \"access_key_id\": \"$AWS_ACCESS_KEY_ID\",
    \"secret_access_key\": \"$AWS_SECRET_ACCESS_KEY\",
    \"s3_bucket\": \"$S3_BUCKET\"
}"

create_or_update_secret \
    "ChambaPE/aws/credentials" \
    "$AWS_CREDENTIALS" \
    "AWS service credentials for S3 and SES"

echo ""

# 4. Mail Credentials (SES)
log_info "📧 Setting up mail credentials..."
read -p "Enter SES SMTP username: " SES_USERNAME
read -sp "Enter SES SMTP password: " SES_PASSWORD
echo ""

MAIL_CREDENTIALS="{
    \"username\": \"$SES_USERNAME\",
    \"password\": \"$SES_PASSWORD\"
}"

create_or_update_secret \
    "ChambaPE/mail/credentials" \
    "$MAIL_CREDENTIALS" \
    "SES SMTP credentials for email sending"

echo ""

# 5. App Configuration
log_info "🌐 Setting up app configuration..."
read -p "Enter frontend domain [https://app.chambape.com]: " FRONTEND_DOMAIN
FRONTEND_DOMAIN=${FRONTEND_DOMAIN:-https://app.chambape.com}
read -p "Enter backend domain [https://api.chambape.com]: " BACKEND_DOMAIN
BACKEND_DOMAIN=${BACKEND_DOMAIN:-https://api.chambape.com}

APP_CONFIG="{
    \"frontend_domain\": \"$FRONTEND_DOMAIN\",
    \"backend_domain\": \"$BACKEND_DOMAIN\"
}"

create_or_update_secret \
    "ChambaPE/app/config" \
    "$APP_CONFIG" \
    "Application configuration (domains, etc.)"

echo ""

# 6. Redis Configuration (ElastiCache)
log_info "🔴 Setting up Redis configuration..."
read -p "Enter Redis connection string [redis://localhost:6379/1]: " REDIS_CONNECTION
REDIS_CONNECTION=${REDIS_CONNECTION:-redis://localhost:6379/1}

REDIS_CONFIG="{
    \"connection_string\": \"$REDIS_CONNECTION\"
}"

create_or_update_secret \
    "ChambaPE/redis/config" \
    "$REDIS_CONFIG" \
    "Redis/ElastiCache configuration"

echo ""

# 7. External API Keys (RENIEC, SUNAT)
log_info "🏛️ Setting up external API keys..."
log_warning "⚠️  Please obtain actual API keys from RENIEC and SUNAT before production!"

read -p "Enter RENIEC API URL [https://api.reniec.gob.pe]: " RENIEC_URL
RENIEC_URL=${RENIEC_URL:-https://api.reniec.gob.pe}
read -p "Enter RENIEC API Key [PLACEHOLDER]: " RENIEC_KEY
RENIEC_KEY=${RENIEC_KEY:-PLACEHOLDER_RENIEC_KEY}

read -p "Enter SUNAT API URL [https://api.sunat.gob.pe]: " SUNAT_URL
SUNAT_URL=${SUNAT_URL:-https://api.sunat.gob.pe}
read -p "Enter SUNAT API Key [PLACEHOLDER]: " SUNAT_KEY
SUNAT_KEY=${SUNAT_KEY:-PLACEHOLDER_SUNAT_KEY}

EXTERNAL_APIS="{
    \"RENIEC_API_URL\": \"$RENIEC_URL\",
    \"RENIEC_API_KEY\": \"$RENIEC_KEY\",
    \"SUNAT_API_URL\": \"$SUNAT_URL\",
    \"SUNAT_API_KEY\": \"$SUNAT_KEY\"
}"

create_or_update_secret \
    "ChambaPE/external/apis" \
    "$EXTERNAL_APIS" \
    "External API credentials (RENIEC, SUNAT)"

echo ""

# 8. OAuth Configuration (Optional)
log_info "🔐 Setting up OAuth configuration..."
log_warning "This is optional. Press Enter to skip if not using OAuth."

read -p "Enter Facebook App ID (optional): " FACEBOOK_APP_ID
read -p "Enter Facebook App Secret (optional): " FACEBOOK_APP_SECRET
read -p "Enter Google Client ID (optional): " GOOGLE_CLIENT_ID
read -p "Enter Google Client Secret (optional): " GOOGLE_CLIENT_SECRET

if [[ -n "$FACEBOOK_APP_ID" || -n "$GOOGLE_CLIENT_ID" ]]; then
    OAUTH_CONFIG="{
        \"facebook_app_id\": \"$FACEBOOK_APP_ID\",
        \"facebook_app_secret\": \"$FACEBOOK_APP_SECRET\",
        \"google_client_id\": \"$GOOGLE_CLIENT_ID\",
        \"google_client_secret\": \"$GOOGLE_CLIENT_SECRET\"
    }"

    create_or_update_secret \
        "ChambaPE/oauth/config" \
        "$OAUTH_CONFIG" \
        "OAuth configuration for social login"
fi

echo ""

# Summary
log_success "🎉 All secrets have been configured successfully!"
echo ""
echo "📋 Configured secrets:"
echo "  • ChambaPE/database/credentials"
echo "  • ChambaPE/jwt/secrets"
echo "  • ChambaPE/aws/credentials"
echo "  • ChambaPE/mail/credentials"
echo "  • ChambaPE/app/config"
echo "  • ChambaPE/redis/config"
echo "  • ChambaPE/external/apis"
if [[ -n "$FACEBOOK_APP_ID" || -n "$GOOGLE_CLIENT_ID" ]]; then
    echo "  • ChambaPE/oauth/config"
fi

echo ""
log_warning "⚠️  IMPORTANT REMINDERS:"
echo "  1. Update the RDS endpoint in the database credentials"
echo "  2. Update the Redis endpoint when ElastiCache is ready"
echo "  3. Replace PLACEHOLDER values with actual API keys"
echo "  4. Update task-definition.json with your AWS Account ID"
echo ""

log_info "🔄 Next steps:"
echo "  1. Run: aws iam create-role --role-name ecsTaskExecutionRole ..."
echo "  2. Run: aws iam create-role --role-name ecsTaskRole ..."
echo "  3. Update task-definition.json with your Account ID"
echo "  4. Run: ./deploy-aws.sh"
echo ""

log_success "✅ Setup complete! Your secrets are ready for deployment."
