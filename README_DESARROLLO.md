# ChambaPE - Guía Completa de Desarrollo Local 🚀

**Plataforma de servicios laborales con matching automático entre trabajadores y clientes**

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

## 📋 Descripción del Proyecto

ChambaPE es una plataforma innovadora que conecta trabajadores de servicios con clientes que necesitan esos servicios. El sistema utiliza un **algoritmo de matching automático** basado en ubicación geográfica y especialidades.

### 🎯 Modelo de Negocio Clave

> **Importante**: Los trabajadores NO aplican manualmente a trabajos. El sistema genera **ofertas automáticas** basadas en matching inteligente.

**Flujo Principal:**
1. **Clientes** publican trabajos/servicios requeridos
2. **Sistema** analiza trabajadores compatibles por ubicación y servicios
3. **Sistema** genera ofertas automáticas para trabajadores elegibles
4. **Trabajadores** reciben ofertas y pueden aceptar/rechazar
5. **Cliente** ve trabajadores interesados y confirma contratación

### 🏗️ Arquitectura y Tecnologías

**Backend:**
- **Framework**: NestJS (Node.js + TypeScript)
- **Base de Datos**: PostgreSQL con TypeORM
- **Autenticación**: JWT + Guards + Roles
- **Documentación**: Swagger/OpenAPI
- **Correos**: NodeMailer + MailDev (desarrollo)
- **Contenedores**: Docker & Docker Compose

**Módulos Principales:**
- **Auth Module** - Registro/login con roles diferenciados
- **Workers Module** - Perfiles especializados con servicios
- **Jobs Module** - Publicación de trabajos por clientes
- **Matching Module** - Algoritmo inteligente de compatibilidad
- **Offers Module** - Sistema de ofertas automáticas
- **Services Module** - Catálogo de servicios disponibles
- **Mail Module** - Notificaciones automáticas

### ✅ Funcionalidades Validadas

- ✅ **Autenticación Completa** - Registro/login con confirmación por email
- ✅ **Sistema de Roles** - Cliente, Trabajador, Admin con permisos específicos
- ✅ **Matching Inteligente** - Algoritmo por ubicación, servicios y disponibilidad
- ✅ **Ofertas Automáticas** - Generación y gestión de ofertas en tiempo real
- ✅ **Búsqueda Geográfica** - Filtrado por radio de distancia y ubicación
- ✅ **Perfiles Especializados** - Trabajadores con servicios y tarifas
- ✅ **Gestión de Trabajos** - CRUD completo para publicaciones
- ✅ **Sistema de Correos** - Notificaciones automáticas funcionales
- ✅ **API REST Completa** - 30+ endpoints documentados y validados
- ✅ **Testing Exhaustivo** - Endpoints validados con datos reales

---

## 🛠️ Prerrequisitos

### Software Requerido

**Windows (PowerShell):**
```powershell
# Node.js 18+ (recomendado)
node --version    # >= v18.x.x

# npm (incluido con Node.js)
npm --version     # >= 8.x.x

# Docker Desktop
docker --version  # Docker version XX.x.x
docker-compose --version  # Docker Compose version XX.x.x

# Git
git --version     # git version X.x.x
```

**Verificación de instalación:**
```powershell
node --version && npm --version && docker --version && git --version
```

### Herramientas Recomendadas

- **Editor**: VS Code con extensiones NestJS/TypeScript
- **API Testing**: Postman (colección incluida) o Swagger UI
- **DB Admin**: Adminer (incluido) o pgAdmin
- **Email Testing**: MailDev (incluido en Docker)

---

## 🚀 Instalación y Configuración

### 1. **Clonar y Preparar Proyecto**

```powershell
# Clonar repositorio
git clone https://github.com/tu-usuario/ChambaPE.git
cd ChambaPE/nestjs-boilerplate

# Instalar dependencias
npm install
```

```

### 2. **Configurar Variables de Entorno**

```powershell
# Copiar archivo de ejemplo
copy env-example-relational .env
```

Edita el archivo `.env` con estos valores optimizados para desarrollo:

```env
# ========================================
# CONFIGURACIÓN BÁSICA
# ========================================
NODE_ENV=development
APP_PORT=3000
APP_NAME="ChambaPE API"
API_PREFIX=api/v1
APP_FALLBACK_LANGUAGE=es
APP_HEADER_LANGUAGE=x-custom-lang

# ========================================
# URLS Y DOMINIOS
# ========================================
FRONTEND_DOMAIN=http://localhost:3000
BACKEND_DOMAIN=http://localhost:3000

# ========================================
# BASE DE DATOS POSTGRESQL
# ========================================
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=root
DATABASE_PASSWORD=secret
DATABASE_NAME=chambape_db
DATABASE_SYNCHRONIZE=false
DATABASE_MAX_CONNECTIONS=100
DATABASE_SSL_ENABLED=false

# ========================================
# AUTENTICACIÓN JWT
# ========================================
AUTH_JWT_SECRET=tu_jwt_secret_muy_seguro_aqui_2024
AUTH_JWT_TOKEN_EXPIRES_IN=15m
AUTH_REFRESH_SECRET=tu_refresh_secret_muy_seguro_aqui_2024
AUTH_REFRESH_TOKEN_EXPIRES_IN=3650d

# ========================================
# SISTEMA DE CORREOS (MAILDEV)
# ========================================
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_CLIENT_PORT=1080
MAIL_USER=
MAIL_PASSWORD=
MAIL_DEFAULT_EMAIL=noreply@chambape.com
MAIL_DEFAULT_NAME="ChambaPE"
MAIL_IGNORE_TLS=true
MAIL_SECURE=false
MAIL_REQUIRE_TLS=false

# ========================================
# ARCHIVOS Y STORAGE
# ========================================
FILE_DRIVER=local
```

### 3. **Levantar Servicios con Docker**

```powershell
# Levantar PostgreSQL, Adminer y MailDev
docker-compose up -d postgres adminer maildev
```

**Servicios que se levantan:**
- 🐘 **PostgreSQL** (puerto 5432) - Base de datos principal
- 🔧 **Adminer** (http://localhost:8080) - Interfaz web para gestionar DB
- 📧 **MailDev** (http://localhost:1080) - Cliente de email para desarrollo

**Verificar que estén corriendo:**
```powershell
docker-compose ps
# Debería mostrar 3 servicios: postgres, adminer, maildev
```

### 4. **Preparar Base de Datos**

```powershell
# Ejecutar migraciones (crear tablas)
npm run migration:run

# Cargar datos iniciales (servicios, usuarios de prueba)
npm run seed:run:relational
```

### 5. **Iniciar Servidor de Desarrollo**

```powershell
# Modo desarrollo con hot-reload
npm run start:dev
```

**¡Listo! El servidor estará disponible en:**
- 🚀 **API Principal**: http://localhost:3000
- 📚 **Swagger UI**: http://localhost:3000/docs  
- 🏥 **Health Check**: http://localhost:3000/api/v1
- 🔧 **Adminer**: http://localhost:8080
- 📧 **MailDev**: http://localhost:1080

---

## 🗄️ Gestión de Base de Datos

### Acceso a Adminer (Interfaz Web)

**URL**: http://localhost:8080

**Credenciales:**
- **Sistema**: PostgreSQL
- **Servidor**: postgres
- **Usuario**: root  
- **Contraseña**: secret
- **Base de datos**: chambape_db

### Comandos Útiles de DB

```powershell
# Ver estado de migraciones
npm run typeorm migration:show

# Generar nueva migración después de cambios en entidades
npm run migration:generate src/database/migrations/NombreDescriptivo

# Ejecutar migraciones pendientes
npm run migration:run

# Revertir última migración
npm run migration:revert

# Recrear DB completa (⚠️ ELIMINA TODOS LOS DATOS)
npm run schema:drop
npm run migration:run  
npm run seed:run:relational
```

### Estructura Principal de la DB

Las tablas principales que se crean:
- **users** - Usuarios base (clientes y trabajadores)
- **workers** - Perfiles de trabajadores con ubicación
- **jobs** - Trabajos publicados por clientes
- **services** - Catálogo de servicios disponibles
- **worker_services** - Relación trabajador-servicios con tarifas
- **offers** - Ofertas automáticas generadas por matching
- **files** - Gestión de archivos subidos

---

## 📧 Sistema de Correos

### MailDev (Desarrollo)

**Funcionalidad**: Captura todos los correos que envía la aplicación para poder revisarlos sin enviarlos realmente.

**Acceso**: http://localhost:1080

**Correos que intercepta:**
- ✉️ Confirmación de registro de usuario
- ✉️ Recuperación de contraseña  
- ✉️ Notificaciones de ofertas automáticas
- ✉️ Confirmaciones de trabajos

**Probar envío:**
```powershell
# 1. Registrar un usuario con datos reales
# 2. Ir a http://localhost:1080
# 3. Ver el correo de confirmación capturado
```

---

## 📚 Documentación de la API

### Swagger UI Interactivo

**URL**: http://localhost:3000/docs

**Características:**
- 📋 Explorar todos los endpoints disponibles
- ⚡ Probar requests directamente desde el navegador
- 📖 Ver schemas de request/response
- 🔐 Autenticación JWT integrada
- 📝 Ejemplos de uso para cada endpoint

### Autenticación en Swagger

```powershell
# 1. Ir a http://localhost:3000/docs
# 2. Registrar usuario en: POST /api/v1/auth/email/register
# 3. Hacer login en: POST /api/v1/auth/email/login  
# 4. Copiar el 'token' de la respuesta
# 5. Click en "Authorize" (🔒) en la parte superior
# 6. Ingresar: Bearer tu_token_aqui
# 7. Ya puedes usar endpoints protegidos
```
```

### 3. **Configurar Variables de Entorno**

Crear archivo `.env` en la raíz del proyecto:

```env
# Base de Datos
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=tu_password_postgres
DATABASE_NAME=chambaipe_dev
DATABASE_SYNCHRONIZE=false
DATABASE_MAX_CONNECTIONS=100
DATABASE_SSL_ENABLED=false
DATABASE_REJECT_UNAUTHORIZED=false
DATABASE_CA=
DATABASE_KEY=
DATABASE_CERT=

# JWT Configuration
AUTH_JWT_SECRET=tu_jwt_secret_super_seguro_aqui
AUTH_JWT_TOKEN_EXPIRES_IN=15m
AUTH_REFRESH_SECRET=tu_refresh_secret_super_seguro_aqui
AUTH_REFRESH_TOKEN_EXPIRES_IN=30d

# Email Configuration (MailDev para desarrollo)
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USER=
MAIL_PASSWORD=
MAIL_IGNORE_TLS=true
MAIL_SECURE=false
MAIL_REQUIRE_TLS=false
MAIL_DEFAULT_EMAIL=noreply@chambaipe.com
MAIL_DEFAULT_NAME=ChambaPE
MAIL_CLIENT_PORT=1080

# App Configuration
APP_PORT=3000
APP_NAME="ChambaPE API"
API_PREFIX=api
APP_FALLBACK_LANGUAGE=es
APP_HEADER_LANGUAGE=x-custom-lang
FRONTEND_DOMAIN=http://localhost:3001
BACKEND_DOMAIN=http://localhost:3000

# Worker
WORKER_HOST=redis://localhost:6379/1
```

### 4. **Levantar MailDev (Para Testing de Emails)**

```bash
# Opción 1: Con Docker (Recomendado)
docker run -d \
  --name maildev \
  -p 1080:1080 \
  -p 1025:1025 \
  maildev/maildev

# Opción 2: Con npm global
npm install -g maildev
maildev
```

**Verificar MailDev**: Abrir http://localhost:1080 en el navegador

### 5. **Ejecutar Migraciones y Seeds**

```bash
# Ejecutar migraciones
npm run migration:run

# Ejecutar seeds (datos iniciales)
npm run seed:run:relational
```

### 6. **Levantar el Servidor de Desarrollo**

```bash
# Modo desarrollo (con hot reload)
npm run start:dev

# El servidor estará disponible en:
# API: http://localhost:3000
# Swagger UI: http://localhost:3000/api/docs
```

---

## 📚 Endpoints Principales

### 🔐 Autenticación
```bash
# Registro de usuario
POST /api/v1/auth/email/register
{
  "email": "usuario@example.com",
  "password": "secret123",
  "firstName": "Nombre",
  "lastName": "Apellido"
}

# Login
POST /api/v1/auth/email/login
{
  "email": "usuario@example.com",
  "password": "secret123"
}

# Perfil actual
GET /api/v1/auth/me
Authorization: Bearer {token}
```

### 👷 Trabajadores
```bash
# Registrar como trabajador
POST /api/v1/workers/register
Authorization: Bearer {token}
{
  "description": "Descripción del trabajador",
  "radiusKm": 15,
  "address": "Dirección completa",
  "latitude": -12.0464,
  "longitude": -77.0428,
  "serviceCategories": [1, 2]
}

# Mi perfil de trabajador
GET /api/v1/workers/me
Authorization: Bearer {token}

# Trabajadores cercanos
GET /api/v1/workers/nearby?latitude=-12.0464&longitude=-77.0428&radiusKm=10
```

### 💼 Trabajos
```bash
# Crear trabajo
POST /api/v1/jobs
Authorization: Bearer {token}
{
  "title": "Título del trabajo",
  "description": "Descripción detallada",
  "serviceCategoryId": 1,
  "latitude": -12.0464,
  "longitude": -77.0428,
  "address": "Dirección del trabajo",
  "estimatedBudget": 100.00,
  "preferredDateTime": "2025-06-25T14:00:00Z"
}

# Listar trabajos
GET /api/v1/jobs

# Mis trabajos
GET /api/v1/jobs/my-jobs
Authorization: Bearer {token}
```

### 🎯 Matching
```bash
# Trabajadores compatibles para un trabajo
GET /api/v1/matching/job/{jobId}/workers
Authorization: Bearer {token}

# Trabajos compatibles para un trabajador
GET /api/v1/matching/worker/{workerId}/jobs
Authorization: Bearer {token}
```

### 💼 Ofertas Automáticas
```bash
# Mis ofertas como trabajador
GET /api/v1/offers/my-offers
Authorization: Bearer {token}

# Aceptar oferta
POST /api/v1/offers/{offerId}/accept
Authorization: Bearer {token}
{
  "message": "Mensaje de aceptación opcional"
}

# Rechazar oferta
POST /api/v1/offers/{offerId}/reject
Authorization: Bearer {token}
{
  "reason": "Razón del rechazo"
}
```

---

## 🧪 Testing del Sistema

### Verificar Instalación
```bash
# 1. Verificar servidor
curl http://localhost:3000
# Respuesta esperada: {"name":"ChambaPE API"}

# 2. Verificar Swagger
# Abrir: http://localhost:3000/api/docs

# 3. Verificar MailDev
# Abrir: http://localhost:1080
```

### Flujo de Testing Básico

1. **Registrar Cliente**:
```bash
POST /api/v1/auth/email/register
{
  "email": "cliente@test.com",
  "password": "secret123",
  "firstName": "Cliente",
  "lastName": "Test"
}
```

2. **Verificar Email** en MailDev (http://localhost:1080)

3. **Login y obtener token**:
```bash
POST /api/v1/auth/email/login
{
  "email": "cliente@test.com",
  "password": "secret123"
}
```

4. **Registrar como trabajador**:
```bash
POST /api/v1/workers/register
# (usar token del paso anterior)
```

5. **Crear trabajo y verificar ofertas automáticas**

### Archivos de Testing Incluidos
- `ChambaPE_Testing_Collection.postman_collection.json` - Colección de Postman
- `GUIA_TESTING_COMPLETA.md` - Guía exhaustiva de testing
- `test-data/` - Archivos JSON de ejemplo

---

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm run start:dev          # Servidor con hot reload
npm run start:debug        # Modo debug
npm run build             # Compilar para producción
npm run start:prod        # Servidor de producción

# Base de Datos
npm run migration:generate # Generar nueva migración
npm run migration:run     # Ejecutar migraciones
npm run migration:revert  # Revertir última migración
npm run seed:run:relational # Ejecutar seeds

# Testing
npm run test             # Tests unitarios
npm run test:e2e         # Tests end-to-end
npm run test:cov         # Tests con cobertura

# Linting
npm run lint             # Verificar código
npm run lint:fix         # Corregir automáticamente
npm run format           # Formatear código
```

---

## 📁 Estructura del Proyecto

```
src/
├── auth/                 # Módulo de autenticación
├── users/               # Gestión de usuarios
├── workers/             # Trabajadores y perfiles
├── jobs/                # Trabajos y CRUD
├── matching/            # Sistema de matching
├── offers/              # Ofertas automáticas
├── service-categories/  # Categorías de servicios
├── files/               # Subida de archivos
├── mail/                # Sistema de correo
├── config/              # Configuraciones
├── database/            # Migraciones y seeds
├── roles/               # Sistema de roles
└── utils/               # Utilidades comunes

docs/                    # Documentación adicional
test/                    # Tests end-to-end
test-data/              # Datos de prueba
```

---

## 🔧 Troubleshooting Común

### Error de Conexión a Base de Datos
```bash
# Verificar que PostgreSQL esté corriendo
sudo service postgresql status

# Verificar conexión
psql -U postgres -d chambaipe_dev -c "SELECT 1;"
```

### Error de Migraciones
```bash
# Limpiar y recrear base de datos
npm run schema:drop
npm run migration:run
npm run seed:run:relational
```

### MailDev No Funciona
```bash
# Reiniciar MailDev
docker restart maildev

# O verificar que el puerto 1025 esté libre
netstat -tlnp | grep 1025
```

### Error de Permisos JWT
```bash
# Verificar que AUTH_JWT_SECRET esté configurado en .env
# Debe ser una cadena larga y segura
```

---

## 🚀 Despliegue

### Variables de Producción
Al desplegar a producción, actualizar:

```env
# Base de datos de producción
DATABASE_HOST=tu_host_produccion
DATABASE_PASSWORD=password_seguro
DATABASE_SSL_ENABLED=true

# JWT más seguro
AUTH_JWT_SECRET=jwt_secret_super_seguro_para_produccion
AUTH_REFRESH_SECRET=refresh_secret_super_seguro_para_produccion

# Email real (no MailDev)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=tu_email@gmail.com
MAIL_PASSWORD=tu_app_password
```

### Comandos de Despliegue
```bash
# Build de producción
npm run build

# Ejecutar migraciones en producción
npm run migration:run

# Iniciar servidor de producción
npm run start:prod
```

---

## 👥 Contribución

### Flujo de Desarrollo
1. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
2. Desarrollar y probar localmente
3. Ejecutar tests: `npm run test`
4. Verificar linting: `npm run lint`
5. Commit y push
6. Crear Pull Request

### Estándares de Código
- **ESLint** configurado con reglas de NestJS
- **Prettier** para formateo automático
- **Conventional Commits** para mensajes de commit
- **TypeScript** estricto habilitado

---

## 📞 Soporte

### Documentación Adicional
- **Swagger UI**: http://localhost:3000/api/docs
- **Guía de Testing**: `GUIA_TESTING_COMPLETA.md`
- **Arquitectura**: `docs/architecture.md`

### Problemas Comunes
Si encuentras problemas, consulta:
1. Esta guía de troubleshooting
2. Los logs del servidor: `npm run start:dev`
3. La documentación en `docs/`
4. Los tests en `test/`

---

**¡El proyecto ChambaPE está listo para desarrollo! 🎉**

*Última actualización: 24 de Junio, 2025*
