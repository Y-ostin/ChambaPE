import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ServiceCategoryDto {
  @ApiProperty({
    description: 'ID único de la categoría',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'Plomería',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la categoría',
    example: 'Servicios de plomería, reparación de tuberías, instalaciones',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'URL del icono de la categoría',
    example: 'https://cdn.example.com/icons/plumbing.svg',
  })
  iconUrl?: string;

  @ApiProperty({
    description: 'Si la categoría está activa',
    example: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Número de trabajadores en esta categoría',
    example: 45,
  })
  workerCount?: number;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2024-01-20T14:45:00.000Z',
  })
  updatedAt: Date;
}
