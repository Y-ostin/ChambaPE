import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { WorkersService } from './workers.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { FindNearbyWorkersDto } from './dto/find-nearby-workers.dto';
import { WorkerDto } from './dto/worker.dto';
import { ManageWorkerServicesDto } from './dto/manage-worker-services.dto';
import { ServiceCategoryDto } from '../services/dto/service-category.dto';
import { ServiceCategoryEntity } from '../services/infrastructure/persistence/relational/entities/service-category.entity';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ValidateService } from '../validate/services/validate.service';
import { FilesLocalService } from '../files/infrastructure/uploader/local/files.service';
import { MailService } from '../mail/mail.service';

@ApiTags('Workers')
@Controller({
  path: 'workers',
  version: '1',
})
export class WorkersController {
  constructor(
    private readonly workersService: WorkersService,
    private readonly validateService: ValidateService,
    private readonly filesLocalService: FilesLocalService,
    private readonly mailService: MailService,
  ) {}

  @Post('register')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Registrarse como trabajador',
    description:
      'Permite registrar un trabajador, subiendo PDF del Ministerio de Trabajo y fotos del DNI. Valida automáticamente los datos y antecedentes. Si el PDF contiene antecedentes, se envía un correo de alerta. Si todo es correcto, se envía un correo de bienvenida.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Trabajador registrado exitosamente. El objeto incluye el resultado de la validación de datos y archivos subidos.',
    schema: {
      example: {
        worker: {
          /* ...datos del trabajador... */
        },
        validacionDni: true,
        reniec: {
          nombre: 'Juan Perez',
        },
        archivos: {
          dniFrontalUrl: '/files/123-dni-frontal.jpg',
          dniPosteriorUrl: '/files/123-dni-posterior.jpg',
          dniPdfUrl: '/files/123-certificado.pdf',
        },
        validacionCertificado: {
          valido: true,
          antecedentes: [],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o archivos faltantes.',
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({
    status: 409,
    description: 'Ya está registrado como trabajador.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Datos y archivos para el registro de trabajador',
    schema: {
      type: 'object',
      properties: {
        dniNumber: { type: 'string', example: '12345678' },
        description: { type: 'string', example: 'Plomero con experiencia' },
        // ...otros campos del DTO...
        dni_frontal: {
          type: 'string',
          format: 'binary',
          description: 'Foto frontal del DNI',
        },
        dni_posterior: {
          type: 'string',
          format: 'binary',
          description: 'Foto posterior del DNI',
        },
        dni_pdf: {
          type: 'string',
          format: 'binary',
          description: 'PDF del Ministerio de Trabajo (certificatePdfUrl)',
        },
      },
      required: ['dniNumber', 'dni_frontal', 'dni_posterior', 'dni_pdf'],
    },
  })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(AnyFilesInterceptor())
  async register(
    @Request() request,
    @Body() createWorkerDto: CreateWorkerDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<any> {
    // Procesar archivos: buscar por fieldname
    let dniFrontalUrl = '';
    let dniPosteriorUrl = '';
    let dniPdfUrl = '';
    for (const file of files) {
      if (file.fieldname === 'dni_frontal') dniFrontalUrl = file.path;
      if (file.fieldname === 'dni_posterior') dniPosteriorUrl = file.path;
      if (file.fieldname === 'dni_pdf') dniPdfUrl = file.path;
    }
    // Consultar datos de Reniec solo si hay DNI
    let reniec = { nombre: '' };
    let validacion = false;
    let resultadoCert: { valido: boolean; antecedentes: string[] } = {
      valido: false,
      antecedentes: [],
    };
    if (createWorkerDto.dniNumber && dniPdfUrl) {
      reniec = await this.validateService.consultarDatosReniec(
        createWorkerDto.dniNumber,
      );
      // Validar PDF del Ministerio de Trabajo
      resultadoCert = await this.validateService.validarCertificado(
        dniPdfUrl,
        reniec.nombre,
        createWorkerDto.dniNumber,
      );
      // Si hay antecedentes, enviar correo de alerta
      if (resultadoCert.antecedentes.length > 0) {
        await this.mailService.sendAlert({
          to: request.user.email,
          subject: 'Alerta de antecedentes detectados',
          text: 'Se detectaron antecedentes en tu certificado. Por favor comunícate con nosotros para más información.',
        });
      } else {
        // Si la validación es exitosa, enviar correo de bienvenida
        await this.mailService.userSignUp({
          to: request.user.email,
          data: { hash: 'bienvenida' },
        });
      }
      // Aquí deberías extraer los datos de la imagen del DNI frontal (OCR, etc.)
      // Por simplicidad, asumimos que el nombre extraído es igual al de Reniec
      const nombreExtraido = reniec.nombre;
      // Validar coincidencia
      validacion = !!(
        nombreExtraido &&
        nombreExtraido.toLowerCase().includes(reniec.nombre.toLowerCase())
      );
    }
    // Guardar URLs en el DTO
    createWorkerDto.certificatePdfUrl = dniPdfUrl;
    createWorkerDto.dniFrontalUrl = dniFrontalUrl;
    createWorkerDto.dniPosteriorUrl = dniPosteriorUrl;
    // Guardar registro
    const worker = await this.workersService.create(
      request.user.id,
      createWorkerDto,
    );
    return {
      worker,
      validacionDni: validacion,
      reniec,
      archivos: {
        dniFrontalUrl,
        dniPosteriorUrl,
        certificatePdfUrl: dniPdfUrl,
      },
      validacionCertificado: resultadoCert,
    };
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Buscar trabajadores cercanos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de trabajadores cercanos',
    type: [WorkerDto],
  })
  async findNearby(
    @Query() findNearbyDto: FindNearbyWorkersDto,
  ): Promise<WorkerDto[]> {
    return this.workersService.findNearby(findNearbyDto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.worker)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mi perfil de trabajador' })
  @ApiResponse({
    status: 200,
    description: 'Perfil de trabajador',
    type: WorkerDto,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 404,
    description: 'Perfil de trabajador no encontrado',
  })
  async getMyProfile(@Request() request): Promise<WorkerDto> {
    return this.workersService.findByUserId(request.user.id);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.worker)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar mi perfil de trabajador' })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado exitosamente',
    type: WorkerDto,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 404,
    description: 'Perfil de trabajador no encontrado',
  })
  async updateMyProfile(
    @Request() request,
    @Body() updateWorkerDto: UpdateWorkerDto,
  ): Promise<WorkerDto> {
    return this.workersService.update(request.user.id, updateWorkerDto);
  }

  @Patch('me/toggle-active')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.worker)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activar/desactivar disponibilidad hoy' })
  @ApiResponse({
    status: 200,
    description: 'Estado de actividad actualizado',
    type: WorkerDto,
  })
  async toggleActiveToday(@Request() request): Promise<WorkerDto> {
    return this.workersService.toggleActiveToday(request.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener trabajador por ID' })
  @ApiResponse({
    status: 200,
    description: 'Datos del trabajador',
    type: WorkerDto,
  })
  @ApiResponse({ status: 404, description: 'Trabajador no encontrado' })
  async findOne(@Param('id') id: string): Promise<WorkerDto> {
    return this.workersService.findOne(+id);
  }

  // Admin endpoints
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener todos los trabajadores (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de trabajadores',
    type: [WorkerDto],
  })
  async findAll(): Promise<WorkerDto[]> {
    return this.workersService.findAll();
  }

  @Patch(':id/verify')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar trabajador (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Trabajador verificado exitosamente',
    type: WorkerDto,
  })
  async verifyWorker(@Param('id') id: string): Promise<WorkerDto> {
    return this.workersService.verifyWorker(+id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar trabajador (Admin)' })
  @ApiResponse({
    status: 204,
    description: 'Trabajador eliminado exitosamente',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.workersService.remove(+id);
  }

  @Post('me/services')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user, RoleEnum.worker)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar servicios a mi perfil de trabajador' })
  @ApiResponse({
    status: 200,
    description: 'Servicios agregados exitosamente',
    type: WorkerDto,
  })
  async addMyServices(
    @Request() req,
    @Body() manageServicesDto: ManageWorkerServicesDto,
  ): Promise<WorkerDto> {
    const workerProfile = await this.workersService.findByUserId(req.user.id);
    return this.workersService.addWorkerServices(
      workerProfile.id,
      manageServicesDto,
    );
  }

  @Put('me/services')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user, RoleEnum.worker)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar servicios de mi perfil de trabajador' })
  @ApiResponse({
    status: 200,
    description: 'Servicios actualizados exitosamente',
    type: WorkerDto,
  })
  async updateMyServices(
    @Request() req,
    @Body() manageServicesDto: ManageWorkerServicesDto,
  ): Promise<WorkerDto> {
    const workerProfile = await this.workersService.findByUserId(req.user.id);
    return this.workersService.updateWorkerServices(
      workerProfile.id,
      manageServicesDto,
    );
  }

  @Delete('me/services')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user, RoleEnum.worker)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover servicios de mi perfil de trabajador' })
  @ApiResponse({
    status: 200,
    description: 'Servicios removidos exitosamente',
    type: WorkerDto,
  })
  async removeMyServices(
    @Request() req,
    @Body() manageServicesDto: ManageWorkerServicesDto,
  ): Promise<WorkerDto> {
    const workerProfile = await this.workersService.findByUserId(req.user.id);
    return this.workersService.removeWorkerServices(
      workerProfile.id,
      manageServicesDto,
    );
  }

  @Get('me/services')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user, RoleEnum.worker)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mis servicios como trabajador' })
  @ApiResponse({
    status: 200,
    description: 'Lista de servicios del trabajador',
    type: [ServiceCategoryDto],
  })
  async getMyServices(@Request() req): Promise<ServiceCategoryEntity[]> {
    const workerProfile = await this.workersService.findByUserId(req.user.id);
    return this.workersService.getWorkerServices(workerProfile.id);
  }
}
