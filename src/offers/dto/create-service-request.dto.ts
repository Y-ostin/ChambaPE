import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateServiceRequestDto {
  @ApiProperty({
    example: 'Reparación de grifo',
    description: 'Título del servicio',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Necesito reparar un grifo que gotea',
    description: 'Descripción detallada',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 'Calle Falsa 123',
    description: 'Dirección del servicio',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: -12.0464, description: 'Latitud' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: -77.0428, description: 'Longitud' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ example: 1, description: 'ID de la categoría de servicio' })
  @IsNumber()
  serviceCategoryId: number;

  @ApiProperty({
    example: 80,
    description: 'Presupuesto estimado',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedBudget?: number;

  @ApiProperty({
    example: '2025-07-01T15:00:00Z',
    required: false,
    description: 'Fecha preferida',
  })
  @IsOptional()
  preferredDateTime?: string;
}
