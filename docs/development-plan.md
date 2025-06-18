# Estructura de Desarrollo - ChambaPE Backend

## 📁 Estructura de Carpetas Propuesta

```
src/
├── auth/                     # ✅ Ya existe
├── users/                    # ✅ Ya existe - expandir
├── workers/                  # 🆕 Nuevo módulo
│   ├── workers.module.ts
│   ├── workers.controller.ts
│   ├── workers.service.ts
│   ├── entities/
│   │   ├── worker-profile.entity.ts
│   │   └── worker-service.entity.ts
│   ├── dto/
│   │   ├── create-worker.dto.ts
│   │   ├── update-worker.dto.ts
│   │   └── worker-availability.dto.ts
│   └── decorators/
│       └── worker-only.decorator.ts
├── services/                 # 🆕 Categorías de servicios
│   ├── services.module.ts
│   ├── services.controller.ts
│   ├── services.service.ts
│   ├── entities/
│   │   └── service-category.entity.ts
│   └── dto/
├── jobs/                     # 🆕 Trabajos/Servicios
│   ├── jobs.module.ts
│   ├── jobs.controller.ts
│   ├── jobs.service.ts
│   ├── entities/
│   │   ├── job.entity.ts
│   │   ├── job-application.entity.ts
│   │   └── job-match.entity.ts
│   ├── dto/
│   └── enums/
│       └── job-status.enum.ts
├── matching/                 # 🆕 Sistema de matching
│   ├── matching.module.ts
│   ├── matching.service.ts
│   └── algorithms/
│       ├── geo-matching.service.ts
│       └── compatibility.service.ts
├── notifications/            # 🆕 Sistema de notificaciones
│   ├── notifications.module.ts
│   ├── notifications.service.ts
│   ├── notifications.gateway.ts  # WebSockets
│   ├── entities/
│   │   └── notification.entity.ts
│   └── providers/
│       ├── firebase.service.ts
│       ├── email.service.ts
│       └── sms.service.ts
├── payments/                 # 🆕 Sistema de pagos
│   ├── payments.module.ts
│   ├── payments.controller.ts
│   ├── payments.service.ts
│   ├── entities/
│   │   ├── payment.entity.ts
│   │   └── subscription.entity.ts
│   └── providers/
│       └── culqi.service.ts
├── ratings/                  # 🆕 Sistema de calificaciones
│   ├── ratings.module.ts
│   ├── ratings.controller.ts
│   ├── ratings.service.ts
│   └── entities/
│       └── rating.entity.ts
├── uploads/                  # 🆕 Gestión de archivos
│   ├── uploads.module.ts
│   ├── uploads.controller.ts
│   ├── uploads.service.ts
│   └── providers/
│       └── aws-s3.service.ts
├── validation/               # 🆕 Validación de documentos
│   ├── validation.module.ts
│   ├── validation.service.ts
│   └── providers/
│       ├── reniec.service.ts
│       └── sunat.service.ts
├── admin/                    # 🆕 Panel de administración
│   ├── admin.module.ts
│   ├── admin.controller.ts
│   └── admin.service.ts
└── shared/                   # 🆕 Utilidades compartidas
    ├── decorators/
    ├── guards/
    ├── interceptors/
    ├── pipes/
    └── utils/
        ├── geolocation.util.ts
        └── distance.util.ts
```

## 🚀 Plan de Desarrollo por Sprints

### **Sprint 1 (Semana 1): Base y Autenticación**
- [ ] Configurar variables de entorno para Perú
- [ ] Configurar PostgreSQL con PostGIS
- [ ] Expandir sistema de autenticación con roles
- [ ] Configurar AWS S3 para documentos
- [ ] Crear middleware de autorización

### **Sprint 2 (Semana 2): Entidades y Base**
- [ ] Crear todas las entidades de la BD
- [ ] Configurar migraciones
- [ ] Crear seeders con datos de prueba
- [ ] Implementar módulo de usuarios expandido
- [ ] Implementar módulo de trabajadores

### **Sprint 3 (Semana 3): Servicios y Trabajos**
- [ ] Implementar módulo de categorías de servicios
- [ ] Implementar CRUD de trabajos
- [ ] Sistema de upload de archivos
- [ ] Validación básica de documentos

### **Sprint 4 (Semana 4): Matching y Geolocalización**
- [ ] Implementar algoritmo de matching geográfico
- [ ] Sistema de compatibilidad trabajador-trabajo
- [ ] API de búsqueda con filtros
- [ ] Sistema de aplicaciones a trabajos

### **Sprint 5 (Semana 5): Notificaciones**
- [ ] Implementar WebSockets para tiempo real
- [ ] Configurar Firebase para push notifications
- [ ] Sistema de notificaciones por email
- [ ] Integración con SMS (Twilio)

### **Sprint 6 (Semana 6): Pagos**
- [ ] Integración con Culqi
- [ ] Sistema de suscripciones mensuales
- [ ] Cálculo de comisiones
- [ ] Gestión de transacciones

### **Sprint 7 (Semana 7): Calificaciones y Admin**
- [ ] Sistema de ratings bidireccional
- [ ] Panel de administración básico
- [ ] Sistema de verificación de trabajadores
- [ ] Analytics básicos

### **Sprint 8 (Semana 8): Testing y Optimización**
- [ ] Tests unitarios e integración
- [ ] Optimización de queries
- [ ] Documentación API
- [ ] Deploy en AWS
