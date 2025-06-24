import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { JobStatus } from '../../jobs/enums/job-status.enum';

export class FindMatchesDto {
  @ApiPropertyOptional({
    description: 'ID del trabajador para buscar matches',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  workerId?: number;

  @ApiPropertyOptional({
    description: 'ID del trabajo para buscar trabajadores compatibles',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  jobId?: number;

  @ApiPropertyOptional({
    description: 'Radio de búsqueda en kilómetros',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  radiusKm?: number = 10;

  @ApiPropertyOptional({
    description: 'Puntaje mínimo de matching',
    example: 70,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minScore?: number = 60;

  @ApiPropertyOptional({
    description: 'Límite de resultados',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Estado de los trabajos a considerar',
    enum: JobStatus,
    example: JobStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(JobStatus)
  jobStatus?: JobStatus = JobStatus.PENDING;
}
