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
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { ServicesService } from './services.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { FindAllServiceCategoriesDto } from './dto/find-all-service-categories.dto';
import { ServiceCategoryDto } from './dto/service-category.dto';

@ApiTags('Service Categories')
@Controller({
  path: 'service-categories',
  version: '1',
})
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear una nueva categoría de servicio (Admin)' })
  @ApiResponse({
    status: 201,
    description: 'Categoría creada exitosamente',
    type: ServiceCategoryDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  @ApiResponse({ status: 409, description: 'Categoría ya existe' })
  async create(
    @Body() createServiceCategoryDto: CreateServiceCategoryDto,
  ): Promise<ServiceCategoryDto> {
    return this.servicesService.create(createServiceCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las categorías de servicio' })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorías obtenida exitosamente',
    type: [ServiceCategoryDto],
  })
  async findAll(
    @Query() query: FindAllServiceCategoriesDto,
  ): Promise<ServiceCategoryDto[]> {
    return this.servicesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una categoría de servicio por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID de la categoría de servicio',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Categoría encontrada',
    type: ServiceCategoryDto,
  })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ServiceCategoryDto> {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar una categoría de servicio (Admin)' })
  @ApiParam({
    name: 'id',
    description: 'ID de la categoría de servicio',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Categoría actualizada exitosamente',
    type: ServiceCategoryDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 409, description: 'Nombre de categoría ya existe' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServiceCategoryDto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategoryDto> {
    return this.servicesService.update(id, updateServiceCategoryDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.super_admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una categoría de servicio (Admin)' })
  @ApiParam({
    name: 'id',
    description: 'ID de la categoría de servicio',
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Categoría eliminada exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'No se puede eliminar: categoría en uso',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.servicesService.remove(id);
  }

  @Patch(':id/toggle-status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.super_admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activar/desactivar una categoría de servicio (Admin)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la categoría de servicio',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de categoría cambiado exitosamente',
    type: ServiceCategoryDto,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async toggleStatus(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ServiceCategoryDto> {
    return this.servicesService.toggleStatus(id);
  }
}
