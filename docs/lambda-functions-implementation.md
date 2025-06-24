# 🔧 Implementación de Lambda Functions - Validación de Trabajadores

## 📋 Estructura de Proyecto para Lambdas

```
lambda-functions/
├── validate-reniec/
│   ├── index.js
│   ├── package.json
│   └── utils/
├── validate-sunat/
│   ├── index.js
│   ├── package.json
│   └── utils/
├── validate-background/
│   ├── index.js
│   ├── package.json
│   └── utils/
└── shared/
    ├── aws-utils.js
    ├── validation-utils.js
    └── errors.js
```

## 🚀 Lambda: Validación RENIEC

### **validate-reniec/index.js**
```javascript
const AWS = require('aws-sdk');
const axios = require('axios');
const { getSecret } = require('../shared/aws-utils');
const { ValidationError, ExternalAPIError } = require('../shared/errors');

const secretsManager = new AWS.SecretsManager();

exports.handler = async (event) => {
    console.log('RENIEC Validation Event:', JSON.stringify(event, null, 2));
    
    try {
        const { workerId, dni, firstName, lastName, birthDate } = event;
        
        if (!dni || dni.length !== 8) {
            throw new ValidationError('DNI debe tener 8 dígitos');
        }
        
        // Obtener API Key de Secrets Manager
        const reniecApiKey = await getSecret('chambape/reniec-api-key');
        
        // Llamar a la API de RENIEC
        const reniecResponse = await validateWithRENIEC(dni, firstName, lastName, birthDate, reniecApiKey);
        
        const result = {
            workerId,
            reniecValid: reniecResponse.valid,
            reniecData: reniecResponse.data,
            timestamp: new Date().toISOString()
        };
        
        if (!reniecResponse.valid) {
            result.rejectionReason = reniecResponse.error || 'Datos no coinciden con RENIEC';
        }
        
        console.log('RENIEC Validation Result:', result);
        return result;
        
    } catch (error) {
        console.error('Error en validación RENIEC:', error);
        
        return {
            workerId: event.workerId,
            reniecValid: false,
            rejectionReason: error.message || 'Error interno en validación RENIEC',
            timestamp: new Date().toISOString()
        };
    }
};

async function validateWithRENIEC(dni, firstName, lastName, birthDate, apiKey) {
    try {
        const response = await axios.post(process.env.RENIEC_API_URL + '/validate', {
            dni,
            firstName,
            lastName,
            birthDate
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        const data = response.data;
        
        // Validar que los datos coincidan
        const nameMatch = data.firstName?.toLowerCase() === firstName.toLowerCase() &&
                         data.lastName?.toLowerCase() === lastName.toLowerCase();
        
        const birthDateMatch = data.birthDate === birthDate;
        
        return {
            valid: nameMatch && birthDateMatch && data.status === 'active',
            data: {
                dni: data.dni,
                fullName: `${data.firstName} ${data.lastName}`,
                birthDate: data.birthDate,
                status: data.status
            },
            error: !nameMatch ? 'Nombres no coinciden' : 
                   !birthDateMatch ? 'Fecha de nacimiento no coincide' : 
                   data.status !== 'active' ? 'DNI no está activo' : null
        };
        
    } catch (error) {
        if (error.response?.status === 404) {
            return {
                valid: false,
                error: 'DNI no encontrado en RENIEC'
            };
        }
        
        throw new ExternalAPIError(`Error en API RENIEC: ${error.message}`);
    }
}
```

### **validate-reniec/package.json**
```json
{
  "name": "chambape-validate-reniec",
  "version": "1.0.0",
  "description": "Lambda function para validar trabajadores con RENIEC",
  "main": "index.js",
  "dependencies": {
    "aws-sdk": "^2.1691.0",
    "axios": "^1.6.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## 🏦 Lambda: Validación SUNAT

### **validate-sunat/index.js**
```javascript
const AWS = require('aws-sdk');
const axios = require('axios');
const { getSecret } = require('../shared/aws-utils');
const { ValidationError, ExternalAPIError } = require('../shared/errors');

exports.handler = async (event) => {
    console.log('SUNAT Validation Event:', JSON.stringify(event, null, 2));
    
    try {
        const { workerId, dni, ruc } = event;
        
        // Obtener API Key de Secrets Manager
        const sunatApiKey = await getSecret('chambape/sunat-api-key');
        
        // Validar antecedentes laborales y tributarios
        const sunatResponse = await validateWithSUNAT(dni, ruc, sunatApiKey);
        
        const result = {
            ...event,
            sunatValid: sunatResponse.valid,
            sunatData: sunatResponse.data,
            timestamp: new Date().toISOString()
        };
        
        if (!sunatResponse.valid) {
            result.rejectionReason = sunatResponse.error || 'Problemas en registros SUNAT';
        }
        
        console.log('SUNAT Validation Result:', result);
        return result;
        
    } catch (error) {
        console.error('Error en validación SUNAT:', error);
        
        return {
            ...event,
            sunatValid: false,
            rejectionReason: error.message || 'Error interno en validación SUNAT',
            timestamp: new Date().toISOString()
        };
    }
};

async function validateWithSUNAT(dni, ruc, apiKey) {
    try {
        // Verificar si tiene RUC activo
        let rucStatus = null;
        if (ruc) {
            const rucResponse = await axios.get(`${process.env.SUNAT_API_URL}/ruc/${ruc}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 30000
            });
            rucStatus = rucResponse.data;
        }
        
        // Verificar antecedentes tributarios por DNI
        const tributaryResponse = await axios.get(`${process.env.SUNAT_API_URL}/tributary/${dni}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            timeout: 30000
        });
        
        const tributaryData = tributaryResponse.data;
        
        // Criterios de validación SUNAT
        const hasDebt = tributaryData.debt > 0;
        const hasInfractions = tributaryData.infractions?.length > 0;
        const rucActive = rucStatus ? rucStatus.status === 'ACTIVO' : true;
        
        const valid = !hasDebt && !hasInfractions && rucActive;
        
        return {
            valid,
            data: {
                dni,
                ruc: ruc || null,
                rucStatus: rucStatus?.status || 'N/A',
                debt: tributaryData.debt || 0,
                infractions: tributaryData.infractions || [],
                lastUpdate: tributaryData.lastUpdate
            },
            error: hasDebt ? 'Tiene deudas tributarias pendientes' :
                   hasInfractions ? 'Tiene infracciones tributarias' :
                   !rucActive ? 'RUC no está activo' : null
        };
        
    } catch (error) {
        if (error.response?.status === 404) {
            // No tener registros en SUNAT puede ser válido para trabajadores dependientes
            return {
                valid: true,
                data: {
                    dni,
                    status: 'No registrado en SUNAT',
                    debt: 0,
                    infractions: []
                }
            };
        }
        
        throw new ExternalAPIError(`Error en API SUNAT: ${error.message}`);
    }
}
```

## 📄 Lambda: Validación de Antecedentes

### **validate-background/index.js**
```javascript
const AWS = require('aws-sdk');
const { analyzeDocument } = require('../shared/document-analyzer');
const { getS3Object, putS3Object } = require('../shared/aws-utils');

const s3 = new AWS.S3();
const textract = new AWS.Textract();

exports.handler = async (event) => {
    console.log('Background Validation Event:', JSON.stringify(event, null, 2));
    
    try {
        const { workerId, certificateS3Key } = event;
        
        if (!certificateS3Key) {
            throw new Error('Certificado único laboral no proporcionado');
        }
        
        // Descargar certificado de S3
        const certificateBuffer = await getS3Object(process.env.S3_BUCKET, certificateS3Key);
        
        // Analizar documento con Textract
        const documentAnalysis = await analyzeDocumentWithTextract(certificateBuffer);
        
        // Validar el contenido del certificado
        const validationResult = await validateCertificateContent(documentAnalysis);
        
        // Guardar análisis en S3 para auditoría
        await putS3Object(
            process.env.S3_BUCKET,
            `analyses/${workerId}-analysis.json`,
            JSON.stringify(documentAnalysis, null, 2)
        );
        
        const result = {
            ...event,
            backgroundClean: validationResult.valid,
            certificateData: validationResult.data,
            timestamp: new Date().toISOString()
        };
        
        if (!validationResult.valid) {
            result.rejectionReason = validationResult.error || 'Problemas en certificado laboral';
        }
        
        console.log('Background Validation Result:', result);
        return result;
        
    } catch (error) {
        console.error('Error en validación de antecedentes:', error);
        
        return {
            ...event,
            backgroundClean: false,
            rejectionReason: error.message || 'Error interno en validación de antecedentes',
            timestamp: new Date().toISOString()
        };
    }
};

async function analyzeDocumentWithTextract(documentBuffer) {
    try {
        const params = {
            Document: {
                Bytes: documentBuffer
            },
            FeatureTypes: ['TABLES', 'FORMS']
        };
        
        const result = await textract.analyzeDocument(params).promise();
        
        // Extraer texto y campos relevantes
        const extractedText = result.Blocks
            .filter(block => block.BlockType === 'LINE')
            .map(block => block.Text)
            .join(' ');
        
        const extractedFields = result.Blocks
            .filter(block => block.BlockType === 'KEY_VALUE_SET')
            .map(block => ({
                key: block.Text,
                confidence: block.Confidence
            }));
        
        return {
            fullText: extractedText,
            fields: extractedFields,
            confidence: result.Blocks.reduce((acc, block) => acc + block.Confidence, 0) / result.Blocks.length
        };
        
    } catch (error) {
        throw new Error(`Error en análisis de documento: ${error.message}`);
    }
}

async function validateCertificateContent(analysis) {
    const { fullText, confidence } = analysis;
    
    // Verificar que el documento sea un certificado laboral válido
    const keywords = [
        'certificado único laboral',
        'registro nacional de trabajadores',
        'ministerio de trabajo',
        'antecedentes laborales'
    ];
    
    const hasRequiredKeywords = keywords.some(keyword => 
        fullText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Verificar confianza del OCR
    const minConfidence = 80;
    const goodConfidence = confidence >= minConfidence;
    
    // Buscar indicadores de problemas
    const problemIndicators = [
        'antecedentes penales',
        'investigación judicial',
        'proceso disciplinario',
        'sanción laboral',
        'despido por falta grave'
    ];
    
    const hasProblems = problemIndicators.some(indicator => 
        fullText.toLowerCase().includes(indicator.toLowerCase())
    );
    
    const valid = hasRequiredKeywords && goodConfidence && !hasProblems;
    
    return {
        valid,
        data: {
            documentType: 'Certificado Único Laboral',
            hasRequiredKeywords,
            confidence: confidence.toFixed(2),
            extractedKeywords: keywords.filter(keyword => 
                fullText.toLowerCase().includes(keyword.toLowerCase())
            ),
            problemsFound: problemIndicators.filter(indicator => 
                fullText.toLowerCase().includes(indicator.toLowerCase())
            )
        },
        error: !hasRequiredKeywords ? 'Documento no es un certificado laboral válido' :
               !goodConfidence ? `Calidad del documento muy baja (${confidence.toFixed(1)}%)` :
               hasProblems ? 'Se encontraron antecedentes problemáticos' : null
    };
}
```

## 🔧 Utilidades Compartidas

### **shared/aws-utils.js**
```javascript
const AWS = require('aws-sdk');

const secretsManager = new AWS.SecretsManager();
const s3 = new AWS.S3();

async function getSecret(secretName) {
    try {
        const result = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
        return result.SecretString;
    } catch (error) {
        console.error(`Error getting secret ${secretName}:`, error);
        throw new Error(`No se pudo obtener el secreto: ${secretName}`);
    }
}

async function getS3Object(bucket, key) {
    try {
        const result = await s3.getObject({ Bucket: bucket, Key: key }).promise();
        return result.Body;
    } catch (error) {
        console.error(`Error getting S3 object ${key}:`, error);
        throw new Error(`No se pudo obtener el archivo: ${key}`);
    }
}

async function putS3Object(bucket, key, body) {
    try {
        await s3.putObject({ 
            Bucket: bucket, 
            Key: key, 
            Body: body,
            ContentType: 'application/json'
        }).promise();
    } catch (error) {
        console.error(`Error putting S3 object ${key}:`, error);
        throw new Error(`No se pudo guardar el archivo: ${key}`);
    }
}

module.exports = {
    getSecret,
    getS3Object,
    putS3Object
};
```

### **shared/errors.js**
```javascript
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

class ExternalAPIError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ExternalAPIError';
    }
}

module.exports = {
    ValidationError,
    ExternalAPIError
};
```

## 📦 Script de Deployment

### **deploy-lambdas.sh**
```bash
#!/bin/bash

echo "🚀 Deploying ChambaPE Lambda Functions..."

# Crear directorios de build
mkdir -p dist/lambdas

# Function: validate-reniec
echo "📦 Building validate-reniec..."
cd lambda-functions/validate-reniec
npm install --production
zip -r ../../dist/lambdas/lambda-reniec.zip . -x "*.git*" "node_modules/.cache/*"
cd ../..

# Function: validate-sunat
echo "📦 Building validate-sunat..."
cd lambda-functions/validate-sunat
npm install --production
zip -r ../../dist/lambdas/lambda-sunat.zip . -x "*.git*" "node_modules/.cache/*"
cd ../..

# Function: validate-background
echo "📦 Building validate-background..."
cd lambda-functions/validate-background
npm install --production
zip -r ../../dist/lambdas/lambda-background.zip . -x "*.git*" "node_modules/.cache/*"
cd ../..

# Copiar archivos a Terraform
cp dist/lambdas/*.zip terraform/

echo "✅ Lambda functions built and ready for deployment!"
echo "📁 Files created:"
ls -la terraform/*.zip

echo ""
echo "🔧 Next steps:"
echo "1. cd terraform"
echo "2. terraform plan"
echo "3. terraform apply"
```

## 🧪 Testing Local de Lambdas

### **test/test-reniec-lambda.js**
```javascript
const { handler } = require('../lambda-functions/validate-reniec/index');

const testEvent = {
    workerId: 'test-worker-123',
    dni: '12345678',
    firstName: 'Juan',
    lastName: 'Pérez',
    birthDate: '1990-01-15'
};

async function testReniecValidation() {
    console.log('🧪 Testing RENIEC Lambda Function...');
    
    try {
        const result = await handler(testEvent);
        console.log('✅ RENIEC Test Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ RENIEC Test Error:', error);
    }
}

testReniecValidation();
```

### **Comando para testing:**
```bash
# Testing individual de lambdas
node test/test-reniec-lambda.js
node test/test-sunat-lambda.js
node test/test-background-lambda.js

# Testing completo del flujo
npm run test:worker-validation
```

## 🎯 Integración con Backend Principal

### **src/workers/workers.controller.ts**
```typescript
import { Controller, Post, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WorkersService } from './workers.service';
import { WorkerValidationService } from './worker-validation.service';

@Controller('workers')
export class WorkersController {
  constructor(
    private readonly workersService: WorkersService,
    private readonly validationService: WorkerValidationService,
  ) {}

  @Post('register-with-validation')
  @UseInterceptors(FileInterceptor('certificate'))
  async registerWorkerWithValidation(
    @Body() createWorkerDto: CreateWorkerDto,
    @UploadedFile() certificate: Express.Multer.File,
  ) {
    // 1. Crear trabajador en estado "pending_validation"
    const worker = await this.workersService.createPendingWorker(createWorkerDto);
    
    // 2. Subir certificado a S3
    const certificateS3Key = await this.validationService.uploadCertificate(
      worker.id,
      certificate,
    );
    
    // 3. Iniciar proceso de validación en Step Functions
    const validationId = await this.validationService.startValidation({
      workerId: worker.id,
      dni: createWorkerDto.dni,
      firstName: createWorkerDto.firstName,
      lastName: createWorkerDto.lastName,
      birthDate: createWorkerDto.birthDate,
      ruc: createWorkerDto.ruc,
      certificateS3Key,
    });
    
    return {
      message: 'Registro iniciado. Te notificaremos el resultado de la validación.',
      workerId: worker.id,
      validationId,
      estimatedTime: '2-5 minutos',
    };
  }
}
```

Esta implementación proporciona:

1. **🔐 Validación robusta** con RENIEC, SUNAT y análisis de certificados
2. **⚡ Procesamiento asíncrono** usando Step Functions y SQS
3. **📊 Trazabilidad completa** de todo el flujo de validación
4. **🛡️ Manejo de errores** y reintentos automáticos
5. **📧 Notificaciones automáticas** del resultado
6. **🧪 Testing integrado** para validar cada componente

¿Te gustaría que profundice en alguna parte específica o que creemos los scripts de deployment automático?
