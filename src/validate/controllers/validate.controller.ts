import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFiles,
  UseInterceptors,
  Body,
  BadRequestException,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { ValidateService } from '../services/validate.service';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';

@Controller('validate')
export class ValidateController {
  constructor(
    private readonly validateService: ValidateService,
    private readonly configService: ConfigService,
  ) {}

  @Post('reniec')
  async consultarReniec(@Body('dni') dni: string) {
    try {
      const token = this.configService.get<string>('RENIEC_TOKEN', {
        infer: true,
      });

      const { data } = await axios.post(
        'https://apiperu.dev/api/dni',
        { dni },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!data.success) {
        throw new BadRequestException(
          data.message || 'Error en consulta RENIEC',
        );
      }

      return {
        nombres: data.data.nombres,
        apellidoPaterno: data.data.apellido_paterno,
        apellidoMaterno: data.data.apellido_materno,
      };
    } catch (error) {
      console.error('Error RENIEC:', error.response?.data || error.message);
      throw new HttpException(
        error.response?.data || 'Error al consultar RENIEC',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('sunat/:ruc')
  async consultarSunat(@Param('ruc') ruc: string) {
    try {
      const token = this.configService.get<string>('RENIEC_TOKEN', {
        infer: true,
      });
      const { data } = await axios.get(
        `https://api.apis.net.pe/v1/ruc?numero=${ruc}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return data;
    } catch (error) {
      console.error('Error SUNAT:', error.response?.data || error.message);
      throw new HttpException(
        error.response?.data || 'Error al consultar SUNAT',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'certificado', maxCount: 1 },
        { name: 'dni_frontal', maxCount: 1 },
        { name: 'dni_posterior', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, cb) => {
            const uniqueName = `${Date.now()}-${file.originalname}`;
            cb(null, uniqueName);
          },
        }),
      },
    ),
  )
  async validarIdentidad(
    @Body() body: any,
    @UploadedFiles()
    files: {
      certificado?: Express.Multer.File[];
      dni_frontal?: Express.Multer.File[];
      dni_posterior?: Express.Multer.File[];
    },
  ) {
    try {
      const { nombres, apellidoPaterno, apellidoMaterno, dni } = body;
      const errores: string[] = [];

      if (!dni || !/^\d{8}$/.test(dni)) {
        errores.push('El DNI debe tener exactamente 8 dígitos.');
      }
      if (!nombres || !apellidoPaterno || !apellidoMaterno) {
        errores.push(
          'Debe proporcionar nombres, apellido paterno y apellido materno.',
        );
      }
      if (!files?.certificado || !files.certificado[0]) {
        errores.push('Debe subir el archivo del certificado.');
      }

      if (errores.length > 0) {
        throw new BadRequestException({
          message: 'Validación fallida.',
          errores,
        });
      }

      const certificadoPath = path.resolve(
        'uploads',
        files.certificado![0].filename,
      );
      const buffer = fs.readFileSync(certificadoPath);
      const parsed = await pdfParse(buffer);
      const contenido = parsed.text
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      const nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      if (!contenido.includes(dni)) {
        errores.push('El DNI no coincide con el certificado.');
      }

      if (!contenido.includes(nombres.toUpperCase())) {
        errores.push('Los nombres no coinciden con el certificado.');
      }
      if (!contenido.includes(apellidoPaterno.toUpperCase())) {
        errores.push('El apellido paterno no coincide con el certificado.');
      }
      if (!contenido.includes(apellidoMaterno.toUpperCase())) {
        errores.push('El apellido materno no coincide con el certificado.');
      }

      if (!contenido.includes('MINISTERIO DE TRABAJO Y PROMOCION DEL EMPLEO')) {
        errores.push(
          'El certificado no proviene del Ministerio de Trabajo y Promoción del Empleo.',
        );
      }

      if (errores.length > 0) {
        throw new BadRequestException({
          message: 'Validación fallida.',
          errores,
        });
      }

      return {
        message: 'Validación recibida y verificada correctamente.',
        data: {
          dni,
          nombreCompleto,
          archivos: {
            certificado: files.certificado![0]?.filename,
            dni_frontal: files.dni_frontal?.[0]?.filename,
            dni_posterior: files.dni_posterior?.[0]?.filename,
          },
        },
      };
    } catch (error) {
      console.error('❌ Error al validar identidad:', error);
      throw new HttpException(
        {
          message: 'Error interno al validar identidad.',
          detalle: error?.response?.message || error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('dni')
  async consultarDni(@Query('dni') dni: string) {
    try {
      const token =
        'c93f36a7a5a6c3b1d97bd4ef260d35d46d6ad1556307a5fa3c6b45bb5a98ef00';
      const url = 'https://apiperu.dev/api/dni';
      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      const body = { dni };
      const { data } = await axios.post(url, body, { headers });
      if (!data.success) {
        throw new BadRequestException(data.message || 'DNI no encontrado');
      }
      return {
        nombres: data.data.nombres,
        apellido_paterno: data.data.apellido_paterno,
        apellido_materno: data.data.apellido_materno,
        nombre_completo: data.data.nombre_completo,
      };
    } catch (error) {
      console.error('Error DNI:', error.response?.data || error.message);
      throw new HttpException(
        error.response?.data || 'Error al consultar DNI',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('cert-unico')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'dniFrontal', maxCount: 1 },
        { name: 'dniPosterior', maxCount: 1 },
        { name: 'certUnico', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, cb) => {
            const uniqueName = `${Date.now()}-${file.originalname}`;
            cb(null, uniqueName);
          },
        }),
      },
    ),
  )
  async validarCertUnico(
    @Body() body: { dni: string },
    @UploadedFiles()
    files: {
      dniFrontal?: Express.Multer.File[];
      dniPosterior?: Express.Multer.File[];
      certUnico?: Express.Multer.File[];
    },
  ) {
    try {
      console.log('🔍 Validando certificado único...');
      console.log('📁 Archivos recibidos:', Object.keys(files));
      console.log('🔍 DNI a validar:', body.dni);

      // Verificar que se subieron todos los archivos
      if (
        !files?.dniFrontal?.[0] ||
        !files?.dniPosterior?.[0] ||
        !files?.certUnico?.[0]
      ) {
        return {
          valido: false,
          mensaje:
            'Debe subir todos los archivos: DNI frontal, DNI posterior y certificado único',
          antecedentes: [],
        };
      }

      // Obtener datos del DNI desde RENIEC
      console.log('🔍 Consultando datos del DNI en RENIEC...');
      let datosDni;
      try {
        const token =
          'c93f36a7a5a6c3b1d97bd4ef260d35d46d6ad1556307a5fa3c6b45bb5a98ef00';
        const url = 'https://apiperu.dev/api/dni';
        const headers = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };
        const dniBody = { dni: body.dni };
        const { data } = await axios.post(url, dniBody, { headers });

        if (!data.success) {
          return {
            valido: false,
            mensaje: 'DNI no encontrado en RENIEC',
            antecedentes: [],
          };
        }

        datosDni = {
          nombres: data.data.nombres,
          apellido_paterno: data.data.apellido_paterno,
          apellido_materno: data.data.apellido_materno,
          nombre_completo: data.data.nombre_completo,
        };

        console.log('✅ Datos del DNI obtenidos:', datosDni);
      } catch (error) {
        console.error('❌ Error consultando DNI:', error);
        return {
          valido: false,
          mensaje: 'Error al consultar DNI en RENIEC',
          antecedentes: [],
        };
      }

      const certUnicoPath = path.resolve(
        'uploads',
        files.certUnico![0].filename,
      );
      console.log('📄 Procesando certificado:', certUnicoPath);

      // Leer y procesar el PDF del certificado
      const buffer = fs.readFileSync(certUnicoPath);
      const parsed = await pdfParse(buffer);
      const contenido = parsed.text
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      console.log('📄 Contenido del certificado procesado');
      console.log(
        '📄 Fragmento del contenido (primeros 500 caracteres):',
        contenido.substring(0, 500),
      );

      // Verificar que es un certificado válido del Ministerio de Trabajo
      const esCertificadoValido =
        contenido.includes('MINISTERIO DE TRABAJO Y PROMOCION DEL EMPLEO') ||
        contenido.includes('MINISTERIO DE TRABAJO') ||
        contenido.includes('MTPE') ||
        contenido.includes('CERTIFICADO UNICO LABORAL') ||
        contenido.includes('CERTIFICADO UNICO') ||
        contenido.includes('CERTIJOVEN') ||
        contenido.includes('CERTIADULTO');

      if (!esCertificadoValido) {
        console.log(
          '❌ Certificado no reconocido como válido del Ministerio de Trabajo',
        );
        console.log('📄 Buscando frases en el contenido...');
        console.log(
          '   - MINISTERIO DE TRABAJO Y PROMOCION DEL EMPLEO:',
          contenido.includes('MINISTERIO DE TRABAJO Y PROMOCION DEL EMPLEO'),
        );
        console.log(
          '   - MINISTERIO DE TRABAJO:',
          contenido.includes('MINISTERIO DE TRABAJO'),
        );
        console.log('   - MTPE:', contenido.includes('MTPE'));
        console.log(
          '   - CERTIFICADO UNICO LABORAL:',
          contenido.includes('CERTIFICADO UNICO LABORAL'),
        );
        console.log(
          '   - CERTIFICADO UNICO:',
          contenido.includes('CERTIFICADO UNICO'),
        );
        console.log('   - CERTIJOVEN:', contenido.includes('CERTIJOVEN'));
        console.log('   - CERTIADULTO:', contenido.includes('CERTIADULTO'));

        return {
          valido: false,
          mensaje:
            'El certificado no proviene del Ministerio de Trabajo y Promoción del Empleo',
          antecedentes: [],
        };
      }

      console.log(
        '✅ Certificado reconocido como válido del Ministerio de Trabajo',
      );

      // Validar que el certificado pertenezca a la misma persona
      console.log(
        '🔍 Validando que el certificado pertenezca a la persona correcta...',
      );

      // Buscar el DNI en el certificado
      const dniEnCertificado = contenido.match(/\b\d{8}\b/);
      if (!dniEnCertificado) {
        return {
          valido: false,
          mensaje: 'No se encontró un DNI válido en el certificado',
          antecedentes: [],
        };
      }

      const dniCertificado = dniEnCertificado[0];
      console.log('🔍 DNI encontrado en certificado:', dniCertificado);
      console.log('🔍 DNI esperado:', body.dni);

      if (dniCertificado !== body.dni) {
        return {
          valido: false,
          mensaje: `El DNI en el certificado (${dniCertificado}) no coincide con el DNI ingresado (${body.dni})`,
          antecedentes: [],
        };
      }

      // Buscar el nombre en el certificado
      const nombreCompletoReniec = datosDni.nombre_completo
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');

      console.log('🔍 Nombre completo de RENIEC:', nombreCompletoReniec);

      // Buscar variaciones del nombre en el certificado
      const nombresReniec = datosDni.nombres
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(' ');

      const apellidosReniec = [
        datosDni.apellido_paterno
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
        datosDni.apellido_materno
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
      ];

      console.log('🔍 Nombres de RENIEC:', nombresReniec);
      console.log('🔍 Apellidos de RENIEC:', apellidosReniec);

      // Verificar que al menos un nombre y un apellido estén en el certificado
      let nombreEncontrado = false;
      let apellidoEncontrado = false;

      for (const nombre of nombresReniec) {
        if (contenido.includes(nombre)) {
          nombreEncontrado = true;
          console.log('✅ Nombre encontrado en certificado:', nombre);
          break;
        }
      }

      for (const apellido of apellidosReniec) {
        if (contenido.includes(apellido)) {
          apellidoEncontrado = true;
          console.log('✅ Apellido encontrado en certificado:', apellido);
          break;
        }
      }

      if (!nombreEncontrado || !apellidoEncontrado) {
        return {
          valido: false,
          mensaje: `Los datos del certificado no coinciden con los datos del DNI ${body.dni}`,
          antecedentes: [],
        };
      }

      console.log(
        '✅ Validación de identidad exitosa - Los documentos pertenecen a la misma persona',
      );

      // Buscar antecedentes en el certificado
      const antecedentes: string[] = [];

      // Buscar frases que indiquen antecedentes POSITIVOS (que sí tiene)
      if (
        contenido.includes('PRESENTA ANTECEDENTE PENAL') ||
        contenido.includes('TIENE ANTECEDENTE PENAL') ||
        contenido.includes('CON ANTECEDENTE PENAL')
      ) {
        antecedentes.push('penal');
      }

      if (
        contenido.includes('PRESENTA ANTECEDENTE JUDICIAL') ||
        contenido.includes('TIENE ANTECEDENTE JUDICIAL') ||
        contenido.includes('CON ANTECEDENTE JUDICIAL')
      ) {
        antecedentes.push('judicial');
      }

      if (
        contenido.includes('PRESENTA ANTECEDENTE POLICIAL') ||
        contenido.includes('TIENE ANTECEDENTE POLICIAL') ||
        contenido.includes('CON ANTECEDENTE POLICIAL')
      ) {
        antecedentes.push('policial');
      }

      // Buscar frases que indiquen antecedentes generales POSITIVOS
      if (
        contenido.includes('PRESENTA ANTECEDENTE') ||
        contenido.includes('TIENE ANTECEDENTE') ||
        contenido.includes('CON ANTECEDENTE')
      ) {
        antecedentes.push('general');
      }

      // Verificar que NO contenga frases negativas (sin antecedentes)
      const sinAntecedentes =
        contenido.includes('SIN ANTECEDENTE') ||
        contenido.includes('NO PRESENTA ANTECEDENTE') ||
        contenido.includes('NO TIENE ANTECEDENTE') ||
        contenido.includes('NO REGISTRA ANTECEDENTE') ||
        contenido.includes('NO REGISTRA ANTECEDENTES');

      // Si dice explícitamente que NO tiene antecedentes, limpiar la lista
      if (sinAntecedentes) {
        antecedentes.length = 0; // Limpiar array
      }

      console.log('🔍 Antecedentes encontrados:', antecedentes);
      console.log('🔍 Frase "SIN ANTECEDENTE" encontrada:', sinAntecedentes);
      if (sinAntecedentes) {
        console.log('✅ Certificado indica que NO tiene antecedentes');
      }

      // Si hay antecedentes, retornar error
      if (antecedentes.length > 0) {
        return {
          valido: false,
          mensaje: 'Se encontraron antecedentes en el certificado',
          antecedentes: antecedentes,
        };
      }

      // Validación exitosa
      console.log('✅ Validación exitosa');
      return {
        valido: true,
        mensaje: 'Documentos validados correctamente',
        antecedentes: [],
      };
    } catch (error) {
      console.error('❌ Error al validar certificado único:', error);
      return {
        valido: false,
        mensaje: 'Error interno al procesar los documentos',
        antecedentes: [],
      };
    }
  }
}
