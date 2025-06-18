import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';

export class FindNearbyWorkersDto {
  @ApiProperty({
    description: 'Latitud de la ubicación',
    example: -12.046374,
  })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Longitud de la ubicación',
    example: -77.042793,
  })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    description: 'Radio de búsqueda en kilómetros',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(50)
  radiusKm?: number = 10;

  @ApiPropertyOptional({
    description: 'ID de categoría de servicio',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  serviceCategoryId?: number;

  @ApiPropertyOptional({
    description: 'Solo trabajadores verificados',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  verifiedOnly?: boolean = false;

  @ApiPropertyOptional({
    description: 'Solo trabajadores activos hoy',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  activeToday?: boolean = false;
}
