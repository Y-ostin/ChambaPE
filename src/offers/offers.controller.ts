import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { OffersService } from './offers.service';
import { OfferDto } from './dto/offer.dto';
import { AcceptOfferDto } from './dto/accept-offer.dto';
import { RejectOfferDto } from './dto/reject-offer.dto';
import { OfferStatus } from './enums/offer-status.enum';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { JobsService } from '../jobs/jobs.service';
import { CreateJobDto } from '../jobs/dto/create-job.dto';

@ApiTags('Offers')
@Controller({
  path: 'offers',
  version: '1',
})
export class OffersController {
  constructor(
    private readonly offersService: OffersService,
    private readonly jobsService: JobsService,
  ) {}

  @Get('my-offers')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.worker)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mis ofertas como worker' })
  @ApiQuery({
    name: 'status',
    description: 'Filtrar por estado de oferta',
    enum: OfferStatus,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ofertas del worker',
    type: [OfferDto],
  })
  async getMyOffers(
    @Request() req,
    @Query('status') status?: OfferStatus,
  ): Promise<OfferDto[]> {
    return this.offersService.getWorkerOffers(req.user.id, status);
  }

  @Post(':id/accept')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.worker)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aceptar una oferta' })
  @ApiParam({
    name: 'id',
    description: 'ID de la oferta',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Oferta aceptada exitosamente',
    type: OfferDto,
  })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes permiso' })
  @ApiResponse({ status: 400, description: 'Oferta no disponible' })
  @HttpCode(HttpStatus.OK)
  async acceptOffer(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() acceptDto: AcceptOfferDto,
  ): Promise<OfferDto> {
    return this.offersService.acceptOffer(id, req.user.id, acceptDto);
  }

  @Post(':id/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.worker)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rechazar una oferta' })
  @ApiParam({
    name: 'id',
    description: 'ID de la oferta',
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Oferta rechazada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes permiso' })
  @ApiResponse({ status: 400, description: 'Oferta no disponible' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async rejectOffer(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() rejectDto: RejectOfferDto,
  ): Promise<void> {
    return this.offersService.rejectOffer(id, req.user.id, rejectDto);
  }

  @Patch(':id/complete')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar oferta como completada (solo admin)' })
  @ApiParam({
    name: 'id',
    description: 'ID de la oferta',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Oferta marcada como completada',
    type: OfferDto,
  })
  async completeOffer(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OfferDto> {
    return this.offersService.completeOffer(id);
  }

  @Post('request')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publicar solicitud de servicio (cliente)' })
  @ApiBody({ type: CreateServiceRequestDto })
  @ApiResponse({ status: 201, description: 'Solicitud creada', type: OfferDto })
  async createServiceRequest(
    @Request() req,
    @Body() dto: CreateServiceRequestDto,
  ): Promise<OfferDto | { message: string }> {
    // Crear trabajo usando JobsService
    const jobDto = await this.jobsService.create(req.user.id, {
      title: dto.title,
      description: dto.description,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      serviceCategoryId: dto.serviceCategoryId,
      estimatedBudget: dto.estimatedBudget,
      preferredDateTime: dto.preferredDateTime,
    } as CreateJobDto);

    // Crear oferta automática (ya llamado dentro de JobsService.create), devolver mensaje
    return {
      message: 'Solicitud creada exitosamente',
      jobId: jobDto.id,
    } as any;
  }
}
