import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateServiceCategoryDto {
  @ApiProperty({
    description: 'Nombre de la categoría de servicio',
    example: 'Plomería',
    maxLength: 100,
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la categoría',
    example: 'Servicios de plomería, reparación de tuberías, instalaciones',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'URL del icono de la categoría',
    example: 'https://cdn.example.com/icons/plumbing.svg',
  })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({
    description: 'Si la categoría está activa',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
