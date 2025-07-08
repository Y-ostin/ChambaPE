# ChambaPE - Plataforma de Servicios Laborales 🚀

**Conectando trabajadores con clientes a través de matching automático inteligente**

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

---

## 🎯 ¿Qué es ChambaPE?

ChambaPE es una plataforma innovadora que revoluciona la forma en que se conectan los trabajadores de servicios con los clientes. Utilizando **algoritmos de matching automático**, la plataforma:

- 🔍 **Encuentra automáticamente** trabajadores compatibles para cada trabajo
- 📍 **Utiliza geolocalización** para conectar usuarios por proximidad
- ⚡ **Genera ofertas instantáneas** sin necesidad de aplicación manual
- 🎯 **Optimiza el matching** basado en servicios, tarifas y disponibilidad

### 🚀 Inicio Rápido

```powershell
# 1. Clonar proyecto
git clone https://github.com/tu-usuario/ChambaPE.git
cd ChambaPE/nestjs-boilerplate

# 2. Configurar entorno
copy env-example-relational .env
npm install

# 3. Levantar servicios
docker-compose up -d postgres adminer maildev

# 4. Preparar base de datos
npm run migration:run
npm run seed:run:relational

# 5. Iniciar desarrollo
npm run start:dev
```

**🎉 ¡Listo!** Tu API estará en http://localhost:3000

- **📚 Documentación**: http://localhost:3000/docs
- **🔧 Admin DB**: http://localhost:8080
- **📧 MailDev**: http://localhost:1080

---

## ✨ Características Principales

### 🤖 **Matching Automático Inteligente**

- Algoritmo que analiza ubicación, servicios y disponibilidad
- Generación automática de ofertas sin intervención manual
- Sistema de puntuación para optimizar compatibilidad

### 🔐 **Autenticación Robusta**

- Registro diferenciado por roles (Cliente/Trabajador)
- Autenticación JWT con refresh tokens
- Confirmación por email y recuperación de contraseña

### 📍 **Geolocalización Avanzada**

- Búsqueda por radio de distancia
- Cálculo de proximidad en tiempo real
- Filtros geográficos optimizados

### 💼 **Gestión Completa de Servicios**

- Catálogo extenso de servicios especializados
- Tarifas personalizadas por trabajador
- Sistema de calificaciones y reviews

### 📱 **API REST Completa**

- 30+ endpoints documentados
- Swagger UI interactivo
- Validación exhaustiva con DTOs

### 📧 **Sistema de Notificaciones**

- Emails automáticos para confirmaciones
- Notificaciones de ofertas en tiempo real
- Plantillas personalizables

### 🔒 **Validación de Trabajadores (NUEVA FUNCIONALIDAD)**

- **Integración con RENIEC** para validación de identidad
- **Verificación SUNAT** para antecedentes tributarios
- **Análisis de Certificado Único Laboral** con AWS Textract
- **Flujo de validación automatizado** usando AWS Step Functions
- **Procesamiento asíncrono** con Lambda Functions y SQS

---

## 🏗️ Arquitectura

### **Backend (NestJS)**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Autenticación │    │    Matching     │    │     Ofertas     │
│      Module     │    │     Module      │    │     Module      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Trabajadores  │    │   PostgreSQL    │    │      Mail       │
│     Module      │◄───┤   TypeORM       │───►│     Module      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Tecnologías Core**

- **Framework**: NestJS + TypeScript
- **Base de Datos**: PostgreSQL + TypeORM
- **Autenticación**: JWT + Guards
- **Documentación**: Swagger/OpenAPI
- **Testing**: Jest + Supertest
- **Contenedores**: Docker + Docker Compose

---

## 📊 Estado del Proyecto

### ✅ **Completado y Validado**

- [x] Backend API completo y funcional
- [x] Sistema de matching automático operativo
- [x] Ofertas automáticas implementadas y probadas
- [x] Autenticación y autorización robusta
- [x] Base de datos optimizada y migrada
- [x] Testing exhaustivo de 30+ endpoints
- [x] Documentación completa para desarrolladores
- [x] Sistema de correos funcional
- [x] Geolocalización y búsqueda por proximidad

### 🚧 **En Desarrollo**

- [ ] Frontend React/Vue.js
- [ ] Aplicación móvil (React Native)
- [ ] Sistema de pagos integrado
- [ ] Chat en tiempo real
- [ ] Push notifications

### 🔮 **Roadmap**

- [ ] Inteligencia artificial para mejor matching
- [ ] Sistema de calificaciones bidireccional
- [ ] Marketplace de servicios premium
- [ ] API pública para terceros

---

## 🧪 Testing y Validación

### **Testing Automatizado**

```powershell
npm run test        # Tests unitarios (95% coverage)
npm run test:e2e    # Tests end-to-end completos
npm run test:cov    # Coverage detallado
```

### **Validación Manual**

- ✅ **30+ endpoints** validados con datos reales
- ✅ **Flujos completos** de cliente y trabajador
- ✅ **Matching automático** funcionando correctamente
- ✅ **Sistema de ofertas** generando y gestionando ofertas
- ✅ **Correos** enviándose correctamente
- ✅ **Autenticación** robusta con roles diferenciados

### **Datos de Prueba**

El proyecto incluye archivos JSON con datos de prueba listos para usar:

- 👤 Usuarios de ejemplo (clientes y trabajadores)
- 💼 Trabajos de prueba con diferentes servicios
- 🔧 Perfiles de trabajadores especializados
- 📧 Colección completa de Postman

---

## 📚 Documentación

### **Para Desarrolladores**

- 📖 **[Guía Completa de Desarrollo](README_DESARROLLO.md)** - Setup, configuración y troubleshooting
- 🧪 **[Guía de Testing](GUIA_TESTING_COMPLETA.md)** - Testing exhaustivo y validación
- 🏗️ **[Documentación Técnica](docs/)** - Arquitectura, base de datos y más

### **Para Usuarios de la API**

- 🔗 **Swagger UI**: http://localhost:3000/docs
- 📋 **Colección Postman**: `ChambaPE_Testing_Collection.postman_collection.json`
- 🎯 **Endpoints Clave**: Autenticación, Matching, Ofertas, Workers, Jobs

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Sigue estos pasos:

1. **Fork** el proyecto
2. **Crea** una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

### **Convenciones**

- Usar **Conventional Commits** para mensajes
- Mantener **cobertura de tests** > 90%
- Seguir las **convenciones de TypeScript**
- Actualizar **documentación** cuando sea necesario

---

## 📞 Soporte

- 🐛 **Issues**: [GitHub Issues](https://github.com/tu-usuario/ChambaPE/issues)
- 📧 **Email**: dev@chambape.com
- 📚 **Docs**: Ver carpeta `/docs/` para documentación técnica

---

## 📄 Licencia

Este proyecto está licenciado bajo la **MIT License** - ver el archivo [LICENSE](LICENSE) para detalles.

---

## 🏆 Reconocimientos

Construido con:

- [NestJS](https://nestjs.com/) - Framework Node.js escalable
- [TypeORM](https://typeorm.io/) - ORM para TypeScript
- [PostgreSQL](https://www.postgresql.org/) - Base de datos robusta
- [Docker](https://www.docker.com/) - Contenedorización

---

**Desarrollado con ❤️ para revolucionar el mundo de los servicios laborales**

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Shchepotin"><img src="https://avatars.githubusercontent.com/u/6001723?v=4?s=100" width="100px;" alt="Vladyslav Shchepotin"/><br /><sub><b>Vladyslav Shchepotin</b></sub></a><br /><a href="#maintenance-Shchepotin" title="Maintenance">🚧</a> <a href="#doc-Shchepotin" title="Documentation">📖</a> <a href="#code-Shchepotin" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/SergeiLomako"><img src="https://avatars.githubusercontent.com/u/31205374?v=4?s=100" width="100px;" alt="SergeiLomako"/><br /><sub><b>SergeiLomako</b></sub></a><br /><a href="#code-SergeiLomako" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ElenVlass"><img src="https://avatars.githubusercontent.com/u/72293912?v=4?s=100" width="100px;" alt="Elena Vlasenko"/><br /><sub><b>Elena Vlasenko</b></sub></a><br /><a href="#doc-ElenVlass" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://brocoders.com"><img src="https://avatars.githubusercontent.com/u/226194?v=4?s=100" width="100px;" alt="Rodion"/><br /><sub><b>Rodion</b></sub></a><br /><a href="#business-sars" title="Business development">💼</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## Support

If you seek consulting, support, or wish to collaborate, please contact us via [boilerplates@brocoders.com](mailto:boilerplates@brocoders.com). For any inquiries regarding boilerplates, feel free to ask on [GitHub Discussions](https://github.com/brocoders/nestjs-boilerplate/discussions) or [Discord](https://discord.com/channels/520622812742811698/1197293125434093701).

---

## ☁️ Migración a AWS (Producción)

### 🏗️ **Arquitectura AWS para Validación de Trabajadores**

ChambaPE está diseñado para migrar completamente a AWS, aprovechando servicios especializados para la nueva funcionalidad de validación:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ECS Fargate   │    │  Step Functions │    │  Lambda RENIEC  │
│  (API Principal)│◄───┤  (Orquestación) │───►│  (Validación)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  RDS PostgreSQL │    │   SQS Queues    │    │  Lambda SUNAT   │
│   (Base Datos)  │    │ (Proc. Async)   │    │  (Validación)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ElastiCache Redis│    │      S3         │    │Lambda Background│
│    (Cache)      │    │ (Certificados)  │    │  (Cert. Labor)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 💰 **Estimación de Costos AWS (Mensual)**

| Servicio                  | Uso Estimado                 | Costo Mensual    |
| ------------------------- | ---------------------------- | ---------------- |
| **ECS Fargate**           | 2 tareas, 1 vCPU, 2GB RAM    | $50-100          |
| **RDS PostgreSQL**        | db.t3.small, Multi-AZ        | $50-80           |
| **Lambda Functions**      | 1000 validaciones/mes        | $15-25           |
| **Step Functions**        | Orquestación de validaciones | $5-10            |
| **S3 + CloudWatch**       | Storage y logs               | $15-25           |
| **ALB + VPC**             | Networking                   | $25-35           |
| **SQS + Secrets Manager** | Colas y credenciales         | $5-10            |
| **TOTAL ESTIMADO**        |                              | **$165-285/mes** |

### 🚀 **Comandos de Deployment**

```bash
# Deployment completo (infraestructura + app + validación)
./deploy-aws.sh production us-east-1 full

# Solo funciones Lambda de validación
./deploy-aws.sh production us-east-1 lambdas-only

# Solo aplicación principal
./deploy-aws.sh production us-east-1 app-only

# Solo infraestructura
./deploy-aws.sh production us-east-1 infrastructure-only
```

### 📋 **Servicios AWS Utilizados**

- **🏗️ ECS Fargate** - Contenedores sin gestión de servidores
- **🗃️ RDS PostgreSQL** - Base de datos principal con Multi-AZ
- **⚡ Lambda Functions** - Validaciones RENIEC/SUNAT/Certificados
- **🔄 Step Functions** - Orquestación del flujo de validación
- **📨 SQS** - Colas de procesamiento asíncrono
- **📁 S3** - Almacenamiento de certificados laborales
- **💾 ElastiCache Redis** - Cache y sesiones
- **📧 SES** - Envío de correos transaccionales
- **🔐 Secrets Manager** - Gestión segura de credenciales
- **📊 CloudWatch** - Monitoreo y logs centralizados
- **🛡️ WAF + Security Groups** - Seguridad multinivel

### 🔒 **Nueva Lógica de Validación de Trabajadores**

El flujo de validación integra servicios oficiales peruanos:

1. **📄 Subida de Certificado** - El trabajador sube su Certificado Único Laboral
2. **🔍 Validación RENIEC** - Verificación de identidad con datos oficiales
3. **🏛️ Validación SUNAT** - Verificación de antecedentes tributarios
4. **📋 Análisis de Certificado** - AWS Textract extrae y valida información laboral
5. **✅ Aprobación/Rechazo** - Decisión automática basada en criterios
6. **📧 Notificación** - Email automático con resultado

### 📚 **Documentación AWS**

- **[Plan de Migración](docs/aws-migration-plan.md)** - Estrategia completa de migración
- **[Configuración de Producción](docs/aws-production-config.md)** - Variables de entorno y configuración
- **[Implementación de Lambdas](docs/lambda-functions-implementation.md)** - Código y deployment de validaciones
- **[Script de Deployment](deploy-aws.sh)** - Automatización del despliegue

---
