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
  UnprocessableEntityException,
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
import { StatusEnum } from '../statuses/statuses.enum';
import { WorkersService } from './workers.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { FindNearbyWorkersDto } from './dto/find-nearby-workers.dto';
import { RegisterWorkerPublicDto } from './dto/register-worker-public.dto';
import { WorkerDto } from './dto/worker.dto';
import { ManageWorkerServicesDto } from './dto/manage-worker-services.dto';
import { ServiceCategoryDto } from '../services/dto/service-category.dto';
import { ServiceCategoryEntity } from '../services/infrastructure/persistence/relational/entities/service-category.entity';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ValidateService } from '../validate/services/validate.service';
import { FilesLocalService } from '../files/infrastructure/uploader/local/files.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';

@ApiTags('Workers')
@Controller('workers')
export class WorkersController {
  constructor(
    private readonly workersService: WorkersService,
    private readonly validateService: ValidateService,
    private readonly filesLocalService: FilesLocalService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Registrarse como trabajador (usuario autenticado)',
    description:
      'Permite registrar un trabajador autenticado, subiendo PDF del Ministerio de Trabajo y fotos del DNI. Valida automáticamente los datos y antecedentes.',
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

  @Post('register-public')
  @ApiOperation({
    summary: 'Registro público de trabajador',
    description:
      'Registro público que crea directamente un usuario con rol worker. Primero valida documentos, luego crea usuario y sube archivos.',
  })
  @ApiResponse({
    status: 201,
    description: 'Trabajador registrado exitosamente. Se envía email de verificación.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o archivos faltantes.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Datos y archivos para el registro público de trabajador',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'trabajador@example.com' },
        password: { type: 'string', example: 'password123' },
        firstName: { type: 'string', example: 'Juan' },
        lastName: { type: 'string', example: 'Pérez' },
        dniNumber: { type: 'string', example: '12345678' },
        description: { type: 'string', example: 'Plomero con experiencia' },
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
          description: 'PDF del Ministerio de Trabajo',
        },
      },
      required: ['email', 'password', 'firstName', 'lastName', 'dniNumber', 'dni_frontal', 'dni_posterior', 'dni_pdf'],
    },
  })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(AnyFilesInterceptor())
  async registerPublic(
    @Body() createWorkerDto: RegisterWorkerPublicDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<any> {
    // Leer y parsear el mapeo flexible de archivos
    let filesMeta: Array<{ field: string; type: string }> = [];
    try {
      filesMeta = JSON.parse((createWorkerDto as any).filesMeta || '[]');
    } catch (e) {
      filesMeta = [];
    }
    console.log('📥 filesMeta recibido:', filesMeta);
    console.log('📥 Archivos recibidos:', files.map(f => ({ fieldname: f.fieldname, filename: f.filename, path: f.path })));
    // Procesar archivos usando el mapeo flexible
    let dniFrontalUrl = '';
    let dniPosteriorUrl = '';
    let dniPdfUrl = '';
    for (const meta of filesMeta) {
      const file = files.find(f => f.fieldname.toLowerCase() === meta.field.toLowerCase());
      if (!file) {
        console.warn(`⚠️ Archivo no encontrado para campo '${meta.field}'. Disponibles:`, files.map(f => f.fieldname));
        continue;
      }
      if (meta.type === 'dni_frontal') dniFrontalUrl = file.path;
      if (meta.type === 'dni_posterior') dniPosteriorUrl = file.path;
      if (meta.type === 'dni_pdf') dniPdfUrl = file.path;
    }
    // Validar que todos los archivos estén presentes
    console.log('📥 URLs de archivos encontrados:');
    console.log('  - DNI Frontal:', dniFrontalUrl);
    console.log('  - DNI Posterior:', dniPosteriorUrl);
    console.log('  - DNI PDF:', dniPdfUrl);
    if (!dniFrontalUrl || !dniPosteriorUrl || !dniPdfUrl) {
      console.log('❌ Faltan archivos:');
      if (!dniFrontalUrl) console.log('  - DNI frontal no encontrado');
      if (!dniPosteriorUrl) console.log('  - DNI posterior no encontrado');
      if (!dniPdfUrl) console.log('  - DNI PDF no encontrado');
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          files: 'Todos los archivos son requeridos: DNI frontal, DNI posterior y certificado PDF',
        },
      });
    }

    // PASO 1: Verificar que el email no esté registrado
    const existingUser = await this.usersService.findByEmail(createWorkerDto.email);
    if (existingUser) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: 'Email ya registrado',
        },
      });
    }

    // PASO 2: Verificar que el DNI no esté en uso
    const existingWorker = await this.workersService.findByDniNumber(createWorkerDto.dniNumber);
    if (existingWorker) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          dniNumber: 'DNI ya registrado',
        },
      });
    }

    // PASO 3: Validar documentos ANTES de crear usuario
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

      // Si hay antecedentes, NO crear usuario
      if (resultadoCert.antecedentes.length > 0) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            certificado: 'Se detectaron antecedentes en el certificado. No se puede completar el registro.',
          },
        });
      }

      // Validar coincidencia de nombres
      const nombreExtraido = reniec.nombre;
      validacion = !!(
        nombreExtraido &&
        nombreExtraido.toLowerCase().includes(reniec.nombre.toLowerCase())
      );

      if (!validacion) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            dni: 'Los datos del DNI no coinciden con la información proporcionada.',
          },
        });
      }
    }

    // PASO 4: Crear usuario con rol worker directamente
    const userData = {
      email: createWorkerDto.email,
      password: createWorkerDto.password,
      firstName: createWorkerDto.firstName,
      lastName: createWorkerDto.lastName,
      role: {
        id: RoleEnum.worker,
      },
      status: {
        id: StatusEnum.inactive, // Requiere confirmación por email
      },
    };

    const user = await this.usersService.create(userData);

    // PASO 5: Crear perfil de trabajador con archivos ya validados
    console.log('🔧 Preparando datos del trabajador...');
    const workerData = {
      dniNumber: createWorkerDto.dniNumber,
      description: createWorkerDto.description || 'Trabajador registrado en ChambaPE',
      certificatePdfUrl: dniPdfUrl,
      dniFrontalUrl: dniFrontalUrl,
      dniPosteriorUrl: dniPosteriorUrl,
      radiusKm: createWorkerDto.radiusKm || 15,
      address: createWorkerDto.address,
      latitude: createWorkerDto.latitude,
      longitude: createWorkerDto.longitude,
    };
    console.log('🔧 Datos del trabajador preparados:', workerData);
    console.log('🔧 Tipo de radiusKm en workerData:', typeof workerData.radiusKm);
    console.log('🔧 Valor de radiusKm en workerData:', workerData.radiusKm);

    let worker;
    try {
      console.log('🔧 Llamando a workersService.create...');
      worker = await this.workersService.create(Number(user.id), workerData);
      console.log('🔧 Trabajador creado exitosamente:', worker);
    } catch (error) {
      console.log('❌ Error creando trabajador:', error.message);
      console.log('❌ Error completo:', error);
      throw error;
    }

    // PASO 6: Enviar email de confirmación
    try {
      await this.mailService.userSignUp({
        to: createWorkerDto.email,
        data: { 
          hash: 'confirmacion_trabajador',
        },
      });
    } catch (error) {
      console.log('⚠️ Error enviando email de confirmación:', error.message);
      // No fallar el registro si el email falla
    }

    console.log('✅ Trabajador registrado exitosamente:', user.id);

    return {
      message: 'Trabajador registrado exitosamente. Revisa tu correo para confirmar la cuenta.',
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

  @Patch('me/location')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.worker)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar ubicación del trabajador' })
  @ApiResponse({
    status: 200,
    description: 'Ubicación actualizada exitosamente',
    type: WorkerDto,
  })
  async updateLocation(
    @Request() request,
    @Body() updateLocationDto: { latitude: number; longitude: number },
  ): Promise<WorkerDto> {
    console.log('📍 updateLocation - userId:', request.user.id);
    console.log('📍 updateLocation - datos recibidos:', updateLocationDto);
    console.log('📍 updateLocation - tipo latitude:', typeof updateLocationDto.latitude);
    console.log('📍 updateLocation - tipo longitude:', typeof updateLocationDto.longitude);
    
    return this.workersService.updateLocation(
      request.user.id,
      updateLocationDto.latitude,
      updateLocationDto.longitude,
    );
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
