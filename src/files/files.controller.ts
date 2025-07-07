import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  HttpStatus,
  HttpCode,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { FilesLocalService } from './infrastructure/uploader/local/files.service';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly filesLocalService: FilesLocalService,
  ) {}

  @Post('upload-registration')
  @ApiOperation({
    summary: 'Subir archivos para registro de trabajador',
    description: 'Permite subir archivos (DNI frontal, posterior y certificado) sin autenticación para el proceso de registro de trabajador.',
  })
  @ApiResponse({
    status: 201,
    description: 'Archivos subidos exitosamente',
    schema: {
      example: {
        message: 'Archivos subidos exitosamente',
        files: [
          {
            id: 1,
            path: '/api/v1/files/dni-frontal-12345678.jpg',
          },
          {
            id: 2,
            path: '/api/v1/files/dni-posterior-12345678.jpg',
          },
          {
            id: 3,
            path: '/api/v1/files/certificado-12345678.pdf',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Archivos inválidos o faltantes',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Archivos para registro de trabajador',
    schema: {
      type: 'object',
      properties: {
        dni_frontal: {
          type: 'string',
          format: 'binary',
          description: 'Foto frontal del DNI (requerido)',
        },
        dni_posterior: {
          type: 'string',
          format: 'binary',
          description: 'Foto posterior del DNI (requerido)',
        },
        dni_pdf: {
          type: 'string',
          format: 'binary',
          description: 'PDF del certificado (requerido)',
        },
      },
      required: ['dni_frontal', 'dni_posterior', 'dni_pdf'],
    },
  })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(AnyFilesInterceptor())
  async uploadRegistrationFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<any> {
    console.log('📥 Subida de archivos para registro:', files.length);

    // Validar que se subieron exactamente 3 archivos
    if (files.length !== 3) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          files: 'Se requieren exactamente 3 archivos: DNI frontal, DNI posterior y certificado PDF',
        },
      });
    }

    // Validar nombres de campos
    const requiredFields = ['dni_frontal', 'dni_posterior', 'dni_pdf'];
    const receivedFields = files.map(f => f.fieldname);
    
    for (const field of requiredFields) {
      if (!receivedFields.includes(field)) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            files: `Campo requerido no encontrado: ${field}`,
          },
        });
      }
    }

    // Procesar archivos
    const uploadedFiles: any[] = [];
    for (const file of files) {
      try {
        const result = await this.filesLocalService.create(file);
        uploadedFiles.push(result.file);
        console.log('✅ Archivo subido:', file.fieldname, result.file.path);
      } catch (error) {
        console.log('❌ Error subiendo archivo:', file.fieldname, error.message);
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            files: `Error subiendo archivo ${file.fieldname}: ${error.message}`,
          },
        });
      }
    }

    return {
      message: 'Archivos subidos exitosamente',
      files: uploadedFiles,
    };
  }
} 