# Esquema de Base de Datos - ChambaPE

## Entidades Principales

### 1. **users** (Usuario base)
- id (UUID)
- email (unique)
- phone (unique)
- password_hash
- first_name
- last_name
- avatar_url
- role (USER | WORKER | ADMIN)
- is_verified
- created_at
- updated_at

### 2. **user_profiles** (Perfil de usuario que contrata)
- id (UUID)
- user_id (FK)
- address
- latitude
- longitude
- rating_average
- total_jobs_posted
- created_at
- updated_at

### 3. **worker_profiles** (Perfil de trabajador)
- id (UUID)
- user_id (FK)
- is_verified (verificación de documentos)
- is_active_today (disponible hoy para trabajar)
- rating_average
- total_jobs_completed
- radius_km (radio de trabajo)
- monthly_subscription_status
- subscription_expires_at
- dni_document_url
- criminal_record_url
- certificates_urls (JSON array)
- created_at
- updated_at

### 4. **service_categories** (Categorías de servicios)
- id (UUID)
- name (Limpieza, Cocina, Plomería, etc.)
- description
- icon_url
- is_active
- created_at

### 5. **worker_services** (Servicios que ofrece cada trabajador)
- id (UUID)
- worker_id (FK)
- service_category_id (FK)
- hourly_rate
- description
- experience_years
- created_at

### 6. **jobs** (Trabajos/Servicios solicitados)
- id (UUID)
- user_id (FK - quien contrata)
- worker_id (FK - quien hace el trabajo, null hasta asignación)
- service_category_id (FK)
- title
- description
- location_address
- latitude
- longitude
- photos_urls (JSON array)
- estimated_hours
- budget_min
- budget_max
- status (PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
- scheduled_date
- created_at
- updated_at

### 7. **job_applications** (Aplicaciones a trabajos)
- id (UUID)
- job_id (FK)
- worker_id (FK)
- status (PENDING, ACCEPTED, REJECTED)
- proposed_rate
- estimated_completion_time
- message
- created_at

### 8. **job_matches** (Matches automáticos)
- id (UUID)
- job_id (FK)
- worker_id (FK)
- distance_km
- compatibility_score
- notified_at
- response_status (PENDING, ACCEPTED, REJECTED, EXPIRED)
- expires_at
- created_at

### 9. **ratings** (Sistema de calificaciones)
- id (UUID)
- job_id (FK)
- from_user_id (FK)
- to_user_id (FK)
- rating (1-5)
- comment
- created_at

### 10. **payments** (Sistema de pagos)
- id (UUID)
- job_id (FK)
- amount
- commission_percentage
- commission_amount
- payment_method
- transaction_id
- status (PENDING, COMPLETED, FAILED, REFUNDED)
- created_at

### 11. **worker_subscriptions** (Suscripciones mensuales)
- id (UUID)
- worker_id (FK)
- plan_type
- amount
- start_date
- end_date
- payment_status
- payment_transaction_id
- created_at

### 12. **notifications** (Sistema de notificaciones)
- id (UUID)
- user_id (FK)
- type (JOB_MATCH, JOB_ACCEPTED, JOB_COMPLETED, etc.)
- title
- message
- data (JSON)
- is_read
- created_at
