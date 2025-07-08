# Plan de Testing Exhaustivo - ChambaPE API

## ✅ ESTADO ACTUAL

- **Servidor NestJS**: ✅ Corriendo en http://localhost:3000
- **MailDev**: ✅ Corriendo en http://localhost:1080
- **Swagger UI**: ✅ Disponible en http://localhost:3000/api/docs
- **Módulo Mail**: ✅ VERIFICADO Y FUNCIONANDO

---

## 📋 ENDPOINTS A PROBAR

### 1. **Autenticación** (`/api/v1/auth`)

| Método  | Endpoint                | Descripción          | Archivo JSON         |
| ------- | ----------------------- | -------------------- | -------------------- |
| `POST`  | `/auth/email/register`  | Registro de usuarios | `auth-register.json` |
| `POST`  | `/auth/email/login`     | Login de usuarios    | `auth-login.json`    |
| `POST`  | `/auth/email/confirm`   | Confirmar email      | `auth-confirm.json`  |
| `POST`  | `/auth/forgot/password` | Recuperar contraseña | `auth-forgot.json`   |
| `POST`  | `/auth/reset/password`  | Resetear contraseña  | `auth-reset.json`    |
| `GET`   | `/auth/me`              | Perfil usuario       | -                    |
| `PATCH` | `/auth/me`              | Actualizar perfil    | `auth-update.json`   |
| `POST`  | `/auth/refresh`         | Renovar token        | -                    |
| `POST`  | `/auth/logout`          | Cerrar sesión        | -                    |

### 2. **Usuarios** (`/api/v1/users`) - ADMIN

| Método   | Endpoint     | Descripción        | Archivo JSON        |
| -------- | ------------ | ------------------ | ------------------- |
| `GET`    | `/users`     | Listar usuarios    | -                   |
| `POST`   | `/users`     | Crear usuario      | `users-create.json` |
| `GET`    | `/users/:id` | Obtener usuario    | -                   |
| `PATCH`  | `/users/:id` | Actualizar usuario | `users-update.json` |
| `DELETE` | `/users/:id` | Eliminar usuario   | -                   |

### 3. **Trabajadores** (`/api/v1/workers`)

| Método   | Endpoint               | Descripción           | Archivo JSON            |
| -------- | ---------------------- | --------------------- | ----------------------- |
| `POST`   | `/workers/register`    | Registrar trabajador  | `workers-register.json` |
| `GET`    | `/workers/me`          | Perfil trabajador     | -                       |
| `PATCH`  | `/workers/me`          | Actualizar perfil     | `workers-update.json`   |
| `GET`    | `/workers/nearby`      | Trabajadores cercanos | -                       |
| `GET`    | `/workers`             | Listar trabajadores   | -                       |
| `GET`    | `/workers/:id`         | Obtener trabajador    | -                       |
| `PATCH`  | `/workers/:id/verify`  | Verificar trabajador  | -                       |
| `POST`   | `/workers/me/services` | Agregar servicios     | `workers-services.json` |
| `PUT`    | `/workers/me/services` | Actualizar servicios  | `workers-services.json` |
| `DELETE` | `/workers/me/services` | Eliminar servicios    | -                       |

### 4. **Categorías de Servicios** (`/api/v1/service-categories`)

| Método   | Endpoint                  | Descripción          | Archivo JSON             |
| -------- | ------------------------- | -------------------- | ------------------------ |
| `GET`    | `/service-categories`     | Listar categorías    | -                        |
| `POST`   | `/service-categories`     | Crear categoría      | `categories-create.json` |
| `GET`    | `/service-categories/:id` | Obtener categoría    | -                        |
| `PATCH`  | `/service-categories/:id` | Actualizar categoría | `categories-update.json` |
| `DELETE` | `/service-categories/:id` | Eliminar categoría   | -                        |

### 5. **Trabajos** (`/api/v1/jobs`)

| Método   | Endpoint                     | Descripción        | Archivo JSON       |
| -------- | ---------------------------- | ------------------ | ------------------ |
| `POST`   | `/jobs`                      | Crear trabajo      | `jobs-create.json` |
| `GET`    | `/jobs`                      | Listar trabajos    | -                  |
| `GET`    | `/jobs/my-jobs`              | Mis trabajos       | -                  |
| `GET`    | `/jobs/:id`                  | Obtener trabajo    | -                  |
| `PATCH`  | `/jobs/:id`                  | Actualizar trabajo | `jobs-update.json` |
| `PATCH`  | `/jobs/:id/assign/:workerId` | Asignar trabajador | -                  |
| `PATCH`  | `/jobs/:id/status/:status`   | Cambiar estado     | -                  |
| `DELETE` | `/jobs/:id`                  | Eliminar trabajo   | -                  |

### 6. **Matching** (`/api/v1/matching`) - NUEVO

| Método | Endpoint                          | Descripción               | Archivo JSON          |
| ------ | --------------------------------- | ------------------------- | --------------------- |
| `GET`  | `/matching/worker/:workerId/jobs` | Trabajos para trabajador  | -                     |
| `GET`  | `/matching/job/:jobId/workers`    | Trabajadores para trabajo | -                     |
| `GET`  | `/matching/my-matches`            | Mis matches               | -                     |
| `POST` | `/matching/job/:jobId/apply`      | Aplicar a trabajo         | `matching-apply.json` |

### 7. **Ofertas** (`/api/v1/offers`)

| Método  | Endpoint               | Descripción      | Archivo JSON |
| ------- | ---------------------- | ---------------- | ------------ |
| `GET`   | `/offers/my-offers`    | Mis ofertas      | -            |
| `POST`  | `/offers/:id/accept`   | Aceptar oferta   | -            |
| `POST`  | `/offers/:id/reject`   | Rechazar oferta  | -            |
| `PATCH` | `/offers/:id/complete` | Completar oferta | -            |

### 8. **Archivos** (`/api/v1/files`)

| Método | Endpoint        | Descripción     | Archivo JSON        |
| ------ | --------------- | --------------- | ------------------- |
| `POST` | `/files/upload` | Subir archivo   | `files-upload.json` |
| `GET`  | `/files/:path`  | Obtener archivo | -                   |

---

## 🎯 FLUJO DE TESTING RECOMENDADO

### Fase 1: Configuración Base

1. **Registrar usuario cliente** → Confirmar email → Login
2. **Registrar usuario trabajador** → Confirmar email → Login
3. **Verificar categorías de servicios** (GET)

### Fase 2: Configuración de Trabajador

4. **Actualizar perfil de trabajador** (ubicación, etc.)
5. **Agregar servicios al trabajador**
6. **Activar trabajador**

### Fase 3: Flujo Principal

7. **Cliente crea trabajo**
8. **Buscar trabajadores compatibles** (matching)
9. **Trabajador aplica al trabajo**
10. **Sistema genera ofertas automáticas**
11. **Trabajador acepta/rechaza oferta**
12. **Completar trabajo**

### Fase 4: Testing Avanzado

13. **Testing de ubicaciones geográficas**
14. **Testing de filtros y búsquedas**
15. **Testing de permisos y roles**
16. **Testing de validaciones**

---

## 📝 NOTAS IMPORTANTES

- **Base URL**: `http://localhost:3000`
- **Autenticación**: Bearer Token en header `Authorization`
- **Content-Type**: `application/json`
- **Versión API**: `/api/v1/`

## 🔐 USUARIOS DE PRUEBA CREADOS

1. **Usuario Mail Test**:

   - Email: `test.mail@chambaipe.com`
   - Password: `secret123`
   - Estado: Pendiente de confirmación

2. **Próximos usuarios a crear**:
   - Cliente prueba
   - Trabajador prueba
   - Admin (si no existe)
