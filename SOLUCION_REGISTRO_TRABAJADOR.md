# Solución: Registro Directo de Trabajadores

## Problema Identificado

El flujo original tenía un **bucle circular** que impedía el registro correcto de trabajadores:

1. ❌ Para ser trabajador necesitas ser usuario primero
2. ❌ Para subir archivos necesitas ser trabajador
3. ❌ Pero para validar que eres trabajador necesitas subir archivos durante el registro

## Solución Implementada

### 1. Nuevo DTO para Registro Público

**Archivo:** `src/workers/dto/register-worker-public.dto.ts`

```typescript
export class RegisterWorkerPublicDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dniNumber: string;
  description?: string;
  radiusKm?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
}
```

### 2. Endpoint de Registro Público Mejorado

**Endpoint:** `POST /workers/register-public`

**Características:**

- ✅ No requiere autenticación previa
- ✅ Valida documentos ANTES de crear usuario
- ✅ Crea usuario con rol `worker` directamente
- ✅ Verifica duplicados (email y DNI)
- ✅ Envía email de confirmación

**Flujo:**

1. Validar archivos requeridos (DNI frontal, posterior, certificado)
2. Verificar que email no esté registrado
3. Verificar que DNI no esté en uso
4. Validar documentos con RENIEC y SUNAT
5. Crear usuario con rol worker (status: inactive)
6. Crear perfil de trabajador
7. Enviar email de confirmación

### 3. Método para Verificar DNI Duplicado

**Archivo:** `src/workers/workers.service.ts`

```typescript
async findByDniNumber(dniNumber: string): Promise<WorkerDto | null>
```

### 4. Endpoint para Subida de Archivos Sin Auth

**Endpoint:** `POST /files/upload-registration`

**Características:**

- ✅ No requiere autenticación
- ✅ Valida exactamente 3 archivos requeridos
- ✅ Valida nombres de campos específicos
- ✅ Manejo robusto de errores

## Flujo Final del Registro

```
1. Usuario llena formulario de registro de trabajador
   ↓
2. Se suben archivos (DNI frontal, posterior, certificado)
   ↓
3. Se validan documentos con RENIEC y SUNAT
   ↓
4. Si todo es válido, se crea usuario con rol worker
   ↓
5. Se envía email de confirmación
   ↓
6. Usuario confirma email y puede acceder al dashboard
```

## Endpoints Disponibles

### Registro de Trabajadores

- `POST /workers/register` - Para usuarios autenticados
- `POST /workers/register-public` - **NUEVO** - Registro directo sin auth

### Subida de Archivos

- `POST /files/upload-registration` - **NUEVO** - Subida sin autenticación

## Validaciones Implementadas

### Antes de Crear Usuario

- ✅ Archivos requeridos presentes
- ✅ Email no duplicado
- ✅ DNI no duplicado
- ✅ Validación RENIEC exitosa
- ✅ Validación certificado sin antecedentes
- ✅ Coincidencia de datos DNI

### Manejo de Errores

- ✅ Errores específicos por tipo de validación
- ✅ Mensajes claros para el usuario
- ✅ Logs detallados para debugging

## Ventajas de la Solución

✅ **Elimina el bucle circular**  
✅ **Flujo directo y lógico**  
✅ **Validación previa de documentos**  
✅ **Seguridad mantenida**  
✅ **Experiencia de usuario mejorada**  
✅ **Manejo robusto de errores**  
✅ **Logs para debugging**

## Uso en Frontend

### Registro de Trabajador

```javascript
const formData = new FormData();
formData.append('email', 'juan.perez@email.com');
formData.append('password', 'Password123!');
formData.append('firstName', 'Juan');
formData.append('lastName', 'Pérez');
formData.append('dniNumber', '12345678');
formData.append('description', 'Plomero con experiencia');
formData.append('dni_frontal', fileFrontal);
formData.append('dni_posterior', filePosterior);
formData.append('dni_pdf', fileCertificado);

const response = await fetch('/api/v1/workers/register-public', {
  method: 'POST',
  body: formData,
});
```

### Subida de Archivos

```javascript
const formData = new FormData();
formData.append('dni_frontal', fileFrontal);
formData.append('dni_posterior', filePosterior);
formData.append('dni_pdf', fileCertificado);

const response = await fetch('/api/v1/files/upload-registration', {
  method: 'POST',
  body: formData,
});
```

## Próximos Pasos

1. **Testing:** Probar todos los endpoints con casos edge
2. **Frontend:** Actualizar formularios para usar nuevos endpoints
3. **Documentación:** Actualizar Swagger/OpenAPI
4. **Monitoreo:** Agregar métricas de registro exitoso/fallido
5. **Seguridad:** Revisar rate limiting para endpoints públicos
