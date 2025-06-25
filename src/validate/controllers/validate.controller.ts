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
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { ValidateService } from '../services/validate.service';
import * as fs from 'fs';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';

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
}
