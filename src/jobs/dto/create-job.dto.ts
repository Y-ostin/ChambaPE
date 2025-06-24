import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsDateString,
  IsPositive,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';

export class CreateJobDto {
  @ApiProperty({
    description: 'Título del trabajo',
    example: 'Reparación de grifo en cocina',
    maxLength: 200,
    minLength: 5,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Descripción detallada del trabajo',
    example:
      'Necesito que reparen un grifo que gotea en la cocina. El problema parece ser con la válvula.',
    maxLength: 1000,
    minLength: 10,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiProperty({
    description: 'ID de la categoría de servicio',
    example: 1,
  })
  @IsNumber()
  @IsPositive()
  serviceCategoryId: number;

  @ApiProperty({
    description: 'Latitud de la ubicación del trabajo',
    example: -12.0464,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitud de la ubicación del trabajo',
    example: -77.0428,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: 'Dirección completa del trabajo',
    example: 'Av. Javier Prado 123, San Isidro, Lima',
    maxLength: 300,
  })
  @IsString()
  @MaxLength(300)
  address: string;

  @ApiPropertyOptional({
    description: 'Presupuesto estimado en soles',
    example: 150.0,
    minimum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  estimatedBudget?: number;

  @ApiPropertyOptional({
    description: 'Fecha y hora preferida para realizar el trabajo',
    example: '2025-06-20T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  preferredDateTime?: string;

  @ApiPropertyOptional({
    description: 'URLs de imágenes del problema',
    example: ['https://s3.amazonaws.com/images/problem1.jpg'],
    isArray: true,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({
    description: 'Notas adicionales',
    example: 'Preferiblemente en horas de la mañana',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
