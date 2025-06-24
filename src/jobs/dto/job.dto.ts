import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { User } from '../../users/domain/user';
import { ServiceCategoryDto } from '../../services/dto/service-category.dto';
import { JobStatus } from '../enums/job-status.enum';

export class JobDto {
  @ApiProperty({
    type: Number,
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Título del trabajo',
    example: 'Reparación de grifo en cocina',
  })
  title: string;

  @ApiProperty({
    description: 'Descripción detallada del trabajo',
    example:
      'Necesito que reparen un grifo que gotea en la cocina. El problema parece ser con la válvula.',
  })
  description: string;

  @ApiProperty({
    description: 'Estado actual del trabajo',
    enum: JobStatus,
    example: JobStatus.PENDING,
  })
  status: JobStatus;

  @ApiProperty({
    description: 'Latitud de la ubicación',
    example: -12.0464,
  })
  latitude: number;

  @ApiProperty({
    description: 'Longitud de la ubicación',
    example: -77.0428,
  })
  longitude: number;

  @ApiProperty({
    description: 'Dirección completa',
    example: 'Av. Javier Prado 123, San Isidro, Lima',
  })
  address: string;

  @ApiProperty({
    description: 'Presupuesto estimado en soles',
    example: 150.0,
    nullable: true,
  })
  estimatedBudget?: number;

  @ApiProperty({
    description: 'Fecha y hora preferida',
    example: '2025-06-20T10:00:00Z',
    nullable: true,
  })
  preferredDateTime?: Date;

  @ApiProperty({
    description: 'URLs de imágenes',
    example: ['https://s3.amazonaws.com/images/problem1.jpg'],
    type: [String],
    required: false,
  })
  imageUrls?: string[];

  @ApiProperty({
    description: 'Notas adicionales',
    example: 'Preferiblemente en horas de la mañana',
    nullable: true,
  })
  notes?: string;

  @ApiProperty({
    description: 'Usuario que creó el trabajo',
    type: () => User,
  })
  @Type(() => User)
  user: User;

  @ApiProperty({
    description: 'Trabajador asignado',
    type: () => User,
    nullable: true,
  })
  @Type(() => User)
  worker?: User;

  @ApiProperty({
    description: 'Categoría de servicio',
    type: () => ServiceCategoryDto,
  })
  @Type(() => ServiceCategoryDto)
  serviceCategory: ServiceCategoryDto;

  @ApiProperty({
    description: 'Distancia en kilómetros (solo en búsquedas geográficas)',
    example: 2.5,
    required: false,
  })
  distance?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
