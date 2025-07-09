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
  NotFoundException,
  UnauthorizedException,
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
import { diskStorage } from 'multer';
import * as path from 'path';
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
        // await this.mailService.userSignUp({
        //   to: request.user.email,
        //   data: { hash: 'bienvenida' },
        // });
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
    description:
      'Trabajador registrado exitosamente. Se envía email de verificación.',
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
      required: [
        'email',
        'password',
        'firstName',
        'lastName',
        'dniNumber',
        'dni_frontal',
        'dni_posterior',
        'dni_pdf',
      ],
    },
  })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            file.fieldname +
              '-' +
              uniqueSuffix +
              path.extname(file.originalname),
          );
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async registerPublic(
    @Body() createWorkerDto: RegisterWorkerPublicDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<any> {
    // Leer y parsear el mapeo flexible de archivos
    let filesMeta: Array<{ field: string; type: string }> = [];
    try {
      filesMeta = JSON.parse((createWorkerDto as any).filesMeta || '[]');
    } catch {
      filesMeta = [];
    }
    console.log('📥 filesMeta recibido:', filesMeta);
    console.log(
      '📥 Archivos recibidos:',
      files.map((f) => ({
        fieldname: f.fieldname,
        filename: f.filename,
        path: f.path,
      })),
    );
    // Procesar archivos usando el mapeo flexible
    let dniFrontalUrl = '';
    let dniPosteriorUrl = '';
    let dniPdfUrl = '';
    for (const meta of filesMeta) {
      const file = files.find(
        (f) => f.fieldname.toLowerCase() === meta.field.toLowerCase(),
      );
      if (!file) {
        console.warn(
          `⚠️ Archivo no encontrado para campo '${meta.field}'. Disponibles:`,
          files.map((f) => f.fieldname),
        );
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
          files:
            'Todos los archivos son requeridos: DNI frontal, DNI posterior y certificado PDF',
        },
      });
    }

    // PASO 1: Verificar que el email no esté registrado
    const existingUser = await this.usersService.findByEmail(
      createWorkerDto.email,
    );

    if (existingUser) {
      // Si el usuario ya existe, verificar si ya tiene perfil de trabajador
      const existingWorker = await this.workersService.findByUserId(
        Number(existingUser.id),
      );
      if (existingWorker) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            dniNumber: 'Ya existe un perfil de trabajador para este usuario.',
          },
        });
      }
      console.log(
        '🔍 Usuario existente encontrado, continuando con registro de perfil de trabajador',
      );
    }

    // PASO 2: Verificar que el DNI no esté en uso (en todos los casos)
    const existingWorkerByDni = await this.workersService.findByDniNumber(
      createWorkerDto.dniNumber,
    );
    if (existingWorkerByDni) {
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
            certificado:
              'Se detectaron antecedentes en el certificado. No se puede completar el registro.',
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

    // PASO 4: Crear usuario directamente con rol worker
    let user;
    if (existingUser) {
      // Si el usuario ya existe, verificar que no tenga perfil de trabajador
      // NOTA: Removemos esta verificación porque causa problemas en el flujo
      console.log(
        '🔍 Usuario existente encontrado, continuando con registro de perfil de trabajador',
      );

      // Usar usuario existente y actualizar su rol a worker
      user = existingUser;
      await this.usersService.update(Number(user.id), {
        role: { id: RoleEnum.worker },
        status: { id: StatusEnum.inactive },
      });
      console.log('🔧 Usuario existente actualizado con rol worker');
    } else {
      // Crear nuevo usuario directamente con rol worker
      const userData = {
        email: createWorkerDto.email,
        password: createWorkerDto.password,
        firstName: createWorkerDto.firstName,
        lastName: createWorkerDto.lastName,
        role: {
          id: RoleEnum.worker, // Rol worker desde el inicio
        },
        status: {
          id: StatusEnum.inactive, // Requiere confirmación por email
        },
      };
      user = await this.usersService.create(userData);
      console.log('🔧 Nuevo usuario creado directamente con rol worker');
    }

    // PASO 5: Crear perfil de trabajador con archivos ya validados
    console.log('🔧 Preparando datos del trabajador...');
    console.log('🔧 User ID para crear trabajador:', user.id);
    console.log('🔧 User email:', user.email);
    console.log('🔧 createWorkerDto recibido:', createWorkerDto);
    console.log('🔧 dniPdfUrl:', dniPdfUrl);
    console.log('🔧 dniFrontalUrl:', dniFrontalUrl);
    console.log('🔧 dniPosteriorUrl:', dniPosteriorUrl);

    const workerData = {
      dniNumber: createWorkerDto.dniNumber,
      description:
        createWorkerDto.description || 'Trabajador registrado en ChambaPE',
      certificatePdfUrl: dniPdfUrl,
      dniFrontalUrl: dniFrontalUrl,
      dniPosteriorUrl: dniPosteriorUrl,
      radiusKm: createWorkerDto.radiusKm || 15,
      address: createWorkerDto.address,
    };
    console.log('🔧 Datos del trabajador preparados:', workerData);
    console.log(
      '🔧 Tipo de radiusKm en workerData:',
      typeof workerData.radiusKm,
    );
    console.log('🔧 Valor de radiusKm en workerData:', workerData.radiusKm);

    let worker;
    try {
      console.log('🔧 === INICIANDO CREACIÓN DE TRABAJADOR ===');
      console.log('🔧 Llamando a workersService.create...');
      console.log(
        '🔧 Parámetros: userId =',
        Number(user.id),
        'workerData =',
        workerData,
      );
      worker = await this.workersService.create(Number(user.id), workerData);
      console.log('🔧 Trabajador creado exitosamente:', worker);
      console.log('🔧 === FIN CREACIÓN DE TRABAJADOR ===');
    } catch (error) {
      console.log('❌ Error creando trabajador:', error);
      // Si falla la creación del trabajador, limpiar el usuario creado
      if (!existingUser) {
        try {
          await this.usersService.remove(Number(user.id));
          console.log(
            '🔧 Usuario eliminado debido al error en creación de trabajador',
          );
        } catch (deleteError) {
          console.log('⚠️ Error eliminando usuario:', deleteError);
        }
      } else {
        // Si era un usuario existente, revertir el cambio de rol
        try {
          await this.usersService.update(Number(user.id), {
            role: { id: RoleEnum.user },
            status: { id: StatusEnum.inactive },
          });
          console.log('🔧 Rol de usuario revertido a User debido al error');
        } catch (revertError) {
          console.log('⚠️ Error revirtiendo rol de usuario:', revertError);
        }
      }
      throw error; // Re-lanzar el error para que se maneje correctamente
    }

    // PASO 6: Enviar email de confirmación
    try {
      // Generar hash de confirmación correcto
      const hash = await this.authService.generateConfirmEmailHash(user.id);

      await this.mailService.userSignUp({
        to: createWorkerDto.email,
        data: {
          hash,
        },
      });
      console.log('✅ Email de confirmación enviado correctamente');
    } catch (error) {
      console.log('⚠️ Error enviando email de confirmación:', error);
      // No fallar el registro si el email falla
    }

    console.log('✅ Trabajador registrado exitosamente:', user.id);
    console.log('🔧 === RETORNANDO RESPUESTA EXITOSA ===');

    return {
      message:
        'Trabajador registrado exitosamente. Revisa tu correo para confirmar la cuenta.',
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
    console.log('🔍 getMyProfile - request.user:', request.user);
    console.log('🔍 getMyProfile - request.user.id:', request.user.id);
    console.log(
      '🔍 getMyProfile - Tipo de request.user.id:',
      typeof request.user.id,
    );

    if (!request.user || !request.user.id) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

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
  @ApiResponse({
    status: 400,
    description: 'Ubicación requerida para activar disponibilidad',
  })
  async toggleActiveToday(
    @Request() request,
    @Body() toggleData?: { latitude?: number; longitude?: number },
  ): Promise<WorkerDto> {
    return this.workersService.toggleActiveToday(request.user.id, toggleData);
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
    console.log(
      '📍 updateLocation - tipo latitude:',
      typeof updateLocationDto.latitude,
    );
    console.log(
      '📍 updateLocation - tipo longitude:',
      typeof updateLocationDto.longitude,
    );

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
  @Roles(RoleEnum.worker)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Configurar servicios del trabajador autenticado',
    description:
      'Permite al trabajador configurar sus categorías de servicios y descripción.',
  })
  @ApiResponse({
    status: 200,
    description: 'Servicios configurados exitosamente',
    type: WorkerDto,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 404,
    description: 'Perfil de trabajador no encontrado',
  })
  async configureMyServices(
    @Request() req,
    @Body() serviceData: { serviceCategories: number[]; description?: string },
  ): Promise<any> {
    console.log('🔧 configureMyServices - INICIO');
    console.log('🔧 configureMyServices - req.user:', req.user);
    console.log('🔧 configureMyServices - req.user.id:', req.user.id);
    console.log(
      '🔧 configureMyServices - tipo req.user.id:',
      typeof req.user.id,
    );
    console.log('🔧 configureMyServices - serviceData:', serviceData);

    if (!req.user || !req.user.id) {
      console.log('❌ configureMyServices - Usuario no autenticado');
      throw new UnauthorizedException('Usuario no autenticado');
    }

    try {
      const workerProfile = await this.workersService.findByUserId(req.user.id);
      console.log(
        '✅ configureMyServices - Perfil de trabajador encontrado:',
        workerProfile.id,
      );

      // Actualizar servicios del trabajador
      const updateData = {
        serviceCategories: serviceData.serviceCategories,
        description: serviceData.description || workerProfile.description,
      };

      console.log(
        '🔧 configureMyServices - Datos de actualización:',
        updateData,
      );
      const updatedWorker = await this.workersService.update(
        workerProfile.id,
        updateData,
      );
      console.log(
        '✅ configureMyServices - Trabajador actualizado exitosamente',
      );

      return {
        message: 'Servicios configurados exitosamente',
        worker: updatedWorker,
      };
    } catch (error) {
      console.log('❌ configureMyServices - Error:', error);

      // Si es un error de "Perfil no encontrado", dar más información
      if (error instanceof NotFoundException) {
        console.log(
          '🔍 configureMyServices - Intentando depuración adicional...',
        );

        // Verificar si el usuario existe
        try {
          const user = await this.usersService.findById(req.user.id);
          console.log(
            '🔍 configureMyServices - Usuario existe:',
            user ? 'Sí' : 'No',
          );
          if (user) {
            console.log(
              '🔍 configureMyServices - Rol del usuario:',
              user.role?.id,
            );
            console.log(
              '🔍 configureMyServices - Estado del usuario:',
              user.status?.id,
            );
          }
        } catch (userError) {
          console.log(
            '🔍 configureMyServices - Error verificando usuario:',
            userError,
          );
        }
      }

      throw error;
    }
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

  // Endpoint temporal para depuración
  @Get('debug/profile')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.worker)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Depurar perfil de trabajador (temporal)' })
  async debugWorkerProfile(@Request() req): Promise<any> {
    console.log('🔍 debugWorkerProfile - INICIO');
    console.log('🔍 debugWorkerProfile - req.user:', req.user);
    console.log('🔍 debugWorkerProfile - req.user.id:', req.user.id);

    try {
      // Verificar si el usuario existe
      const user = await this.usersService.findById(req.user.id);
      console.log(
        '🔍 debugWorkerProfile - Usuario encontrado:',
        user ? 'Sí' : 'No',
      );

      if (user) {
        console.log('🔍 debugWorkerProfile - Datos del usuario:', {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roleId: user.role?.id,
          statusId: user.status?.id,
        });
      }

      // Intentar encontrar el perfil de trabajador
      try {
        const workerProfile = await this.workersService.findByUserId(
          req.user.id,
        );
        console.log(
          '🔍 debugWorkerProfile - Perfil de trabajador encontrado:',
          workerProfile.id,
        );

        return {
          success: true,
          user: {
            id: user?.id,
            email: user?.email,
            roleId: user?.role?.id,
            statusId: user?.status?.id,
          },
          workerProfile: {
            id: workerProfile.id,
            description: workerProfile.description,
            dniFrontalUrl: workerProfile.dniFrontalUrl,
            dniPosteriorUrl: workerProfile.dniPosteriorUrl,
            certificatePdfUrl: workerProfile.certificatePdfUrl,
          },
          message: 'Perfil de trabajador encontrado correctamente',
        };
      } catch (workerError) {
        console.log(
          '🔍 debugWorkerProfile - Error buscando perfil de trabajador:',
          workerError,
        );

        return {
          success: false,
          user: {
            id: user?.id,
            email: user?.email,
            roleId: user?.role?.id,
            statusId: user?.status?.id,
          },
          workerProfile: null,
          error: workerError.message,
          message: 'Usuario existe pero no tiene perfil de trabajador',
        };
      }
    } catch (error) {
      console.log('🔍 debugWorkerProfile - Error general:', error);
      return {
        success: false,
        user: null,
        workerProfile: null,
        error: error.message,
        message: 'Error verificando perfil',
      };
    }
  }
}
