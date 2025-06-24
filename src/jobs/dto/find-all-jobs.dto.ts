import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { JobStatus } from '../enums/job-status.enum';

export class FindAllJobsDto {
  @ApiPropertyOptional({
    description: 'Página a consultar',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Número de elementos por página',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filtrar por estado del trabajo',
    enum: JobStatus,
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por categoría de servicio',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  serviceCategoryId?: number;

  @ApiPropertyOptional({
    description: 'Buscar por palabra clave en título o descripción',
    example: 'plomería',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Latitud para búsqueda geográfica',
    example: -12.0464,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitud para búsqueda geográfica',
    example: -77.0428,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Radio de búsqueda en kilómetros',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  radiusKm?: number = 10;
}
