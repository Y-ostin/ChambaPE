import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
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
import { MatchingService } from './matching.service';
import { FindMatchesDto } from './dto/find-matches.dto';
import { ApplyToJobDto } from './dto/apply-to-job.dto';
import { JobMatchDto } from './dto/job-match.dto';

@ApiTags('Matching')
@Controller({
  path: 'matching',
  version: '1',
})
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('worker/:workerId/jobs')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user, RoleEnum.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar trabajos compatibles para un trabajador' })
  @ApiParam({
    name: 'workerId',
    description: 'ID del trabajador',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de trabajos compatibles',
    type: [JobMatchDto],
  })
  @ApiResponse({ status: 404, description: 'Trabajador no encontrado' })
  async findJobsForWorker(
    @Param('workerId', ParseIntPipe) workerId: number,
    @Query() queryDto: FindMatchesDto,
  ): Promise<JobMatchDto[]> {
    return this.matchingService.findMatchesForWorker(workerId, queryDto);
  }

  @Get('job/:jobId/workers')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user, RoleEnum.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar trabajadores compatibles para un trabajo' })
  @ApiParam({
    name: 'jobId',
    description: 'ID del trabajo',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de trabajadores compatibles',
    type: [JobMatchDto],
  })
  @ApiResponse({ status: 404, description: 'Trabajo no encontrado' })
  async findWorkersForJob(
    @Param('jobId', ParseIntPipe) jobId: number,
    @Query() queryDto: FindMatchesDto,
  ): Promise<JobMatchDto[]> {
    return this.matchingService.findMatchesForJob(jobId, queryDto);
  }

  @Get('my-matches')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener trabajos compatibles para el trabajador actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de trabajos compatibles para el usuario actual',
    type: [JobMatchDto],
  })
  async getMyMatches(
    @Request() req,
    @Query() queryDto: FindMatchesDto,
  ): Promise<JobMatchDto[]> {
    return this.matchingService.findMatchesForWorker(req.user.id, queryDto);
  }

  @Post('job/:jobId/apply')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.user)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aplicar a un trabajo' })
  @ApiParam({
    name: 'jobId',
    description: 'ID del trabajo al que aplicar',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'Aplicación enviada exitosamente',
    type: JobMatchDto,
  })
  @ApiResponse({ status: 400, description: 'Ya aplicaste a este trabajo' })
  @ApiResponse({ status: 404, description: 'Trabajo no encontrado' })
  async applyToJob(
    @Request() req,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Body() applyDto: ApplyToJobDto,
  ): Promise<JobMatchDto> {
    return this.matchingService.applyToJob(req.user.id, jobId, applyDto);
  }
}
