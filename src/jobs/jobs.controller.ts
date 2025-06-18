import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
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
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { FindAllJobsDto } from './dto/find-all-jobs.dto';
import { JobDto } from './dto/job.dto';
import { JobStatus } from './enums/job-status.enum';

@ApiTags('Jobs')
@Controller({
  path: 'jobs',
  version: '1',
})
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un nuevo trabajo' })
  @ApiResponse({
    status: 201,
    description: 'Trabajo creado exitosamente',
    type: JobDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 404,
    description: 'Categoría de servicio no encontrada',
  })
  async create(
    @Request() req,
    @Body() createJobDto: CreateJobDto,
  ): Promise<JobDto> {
    return this.jobsService.create(req.user.id, createJobDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener lista de trabajos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de trabajos con paginación',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/JobDto' },
        },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  async findAll(@Query() queryDto: FindAllJobsDto): Promise<{
    data: JobDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.jobsService.findAll(queryDto);
  }

  @Get('my-jobs')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mis trabajos creados' })
  @ApiResponse({
    status: 200,
    description: 'Lista de trabajos del usuario',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/JobDto' },
        },
        total: { type: 'number', example: 10 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  async findMyJobs(
    @Request() req,
    @Query() queryDto: FindAllJobsDto,
  ): Promise<{
    data: JobDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.jobsService.findByUserId(req.user.id, queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un trabajo por ID' })
  @ApiResponse({
    status: 200,
    description: 'Datos del trabajo',
    type: JobDto,
  })
  @ApiResponse({ status: 404, description: 'Trabajo no encontrado' })
  async findOne(@Param('id') id: string): Promise<JobDto> {
    return this.jobsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar un trabajo' })
  @ApiResponse({
    status: 200,
    description: 'Trabajo actualizado exitosamente',
    type: JobDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para actualizar este trabajo',
  })
  @ApiResponse({ status: 404, description: 'Trabajo no encontrado' })
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateJobDto: UpdateJobDto,
  ): Promise<JobDto> {
    return this.jobsService.update(+id, req.user.id, updateJobDto);
  }

  @Patch(':id/assign/:workerId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Asignar trabajador a un trabajo (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Trabajador asignado exitosamente',
    type: JobDto,
  })
  @ApiResponse({ status: 400, description: 'No se puede asignar trabajador' })
  @ApiResponse({
    status: 404,
    description: 'Trabajo o trabajador no encontrado',
  })
  async assignWorker(
    @Param('id') id: string,
    @Param('workerId') workerId: string,
  ): Promise<JobDto> {
    return this.jobsService.assignWorker(+id, +workerId);
  }

  @Patch(':id/status/:status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar estado de un trabajo (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado exitosamente',
    type: JobDto,
  })
  @ApiResponse({ status: 400, description: 'Transición de estado inválida' })
  @ApiResponse({ status: 404, description: 'Trabajo no encontrado' })
  async updateStatus(
    @Param('id') id: string,
    @Param('status') status: JobStatus,
  ): Promise<JobDto> {
    return this.jobsService.updateStatus(+id, status);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un trabajo' })
  @ApiResponse({
    status: 204,
    description: 'Trabajo eliminado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para eliminar este trabajo',
  })
  @ApiResponse({ status: 404, description: 'Trabajo no encontrado' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    return this.jobsService.remove(+id, req.user.id);
  }
}
