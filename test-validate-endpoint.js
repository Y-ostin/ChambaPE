const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testValidateEndpoint() {
  const baseUrl = 'http://localhost:3000';

  try {
    console.log('🧪 Probando endpoint de validación...');

    // Crear un archivo de prueba simple
    const testPdfPath = path.join(__dirname, 'test-certificate.pdf');
    const testImagePath = path.join(__dirname, 'test-image.jpg');

    // Crear archivos de prueba si no existen
    if (!fs.existsSync(testPdfPath)) {
      console.log('📄 Creando PDF de prueba...');
      // Crear un PDF simple con contenido de prueba
      const pdfContent = `
        MINISTERIO DE TRABAJO Y PROMOCION DEL EMPLEO
        CERTIFICADO UNICO LABORAL
        NOMBRE: JUAN PEREZ GARCIA
        DNI: 12345678
        SIN ANTECEDENTES PENALES
        SIN ANTECEDENTES JUDICIALES
        SIN ANTECEDENTES POLICIALES
      `;
      fs.writeFileSync(testPdfPath, pdfContent);
    }

    if (!fs.existsSync(testImagePath)) {
      console.log('🖼️ Creando imagen de prueba...');
      // Crear un archivo de imagen simple
      fs.writeFileSync(testImagePath, 'fake image data');
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('dniFrontal', fs.createReadStream(testImagePath));
    formData.append('dniPosterior', fs.createReadStream(testImagePath));
    formData.append('certUnico', fs.createReadStream(testPdfPath));

    console.log('📤 Enviando archivos al endpoint...');

    const response = await axios.post(
      `${baseUrl}/validate/cert-unico`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 10000,
      },
    );

    console.log('✅ Respuesta exitosa:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error en la prueba:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Ejecutar la prueba
testValidateEndpoint();
