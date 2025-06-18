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

@ApiTags('Workers')
@Controller({
  path: 'workers',
  version: '1',
})
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Post('register')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrarse como trabajador' })
  @ApiResponse({
    status: 201,
    description: 'Trabajador registrado exitosamente',
    type: WorkerDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 409,
    description: 'Ya está registrado como trabajador',
  })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Request() request,
    @Body() createWorkerDto: CreateWorkerDto,
  ): Promise<WorkerDto> {
    return this.workersService.create(request.user.id, createWorkerDto);
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
  @Roles(RoleEnum.user)
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
  @Roles(RoleEnum.user)
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
  @Roles(RoleEnum.user)
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
  @Roles(RoleEnum.user)
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
