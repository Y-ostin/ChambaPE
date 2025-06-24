import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/domain/user';
import { ServiceCategory } from '../../services/domain/service-category';
import { JobStatus } from '../enums/job-status.enum';
import databaseConfig from '../../database/config/database.config';
import { DatabaseConfig } from '../../database/config/database-config.type';

const idType = (databaseConfig() as DatabaseConfig).isDocumentDatabase
  ? String
  : Number;

export class Job {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: () => User,
    description: 'Usuario que solicita el servicio',
  })
  user: User;

  @ApiProperty({
    type: () => User,
    description: 'Trabajador asignado al trabajo',
    nullable: true,
  })
  worker?: User | null;

  @ApiProperty({
    type: () => ServiceCategory,
    description: 'Categoría del servicio solicitado',
  })
  serviceCategory: ServiceCategory;

  @ApiProperty({
    type: String,
    example: 'Limpieza completa de casa',
    description: 'Título del trabajo',
  })
  title: string;

  @ApiProperty({
    type: String,
    example: 'Necesito limpieza profunda de una casa de 3 habitaciones...',
    description: 'Descripción detallada del trabajo',
  })
  description: string;

  @ApiProperty({
    type: String,
    example: 'Av. José Larco 123, Miraflores, Lima',
    description: 'Dirección donde se realizará el trabajo',
  })
  locationAddress: string;

  @ApiProperty({
    type: Number,
    example: -12.1267,
    description: 'Latitud de la ubicación del trabajo',
  })
  latitude: number;

  @ApiProperty({
    type: Number,
    example: -77.0278,
    description: 'Longitud de la ubicación del trabajo',
  })
  longitude: number;

  @ApiProperty({
    type: [String],
    example: [
      'https://s3.amazonaws.com/chambaipe/jobs/photo1.jpg',
      'https://s3.amazonaws.com/chambaipe/jobs/photo2.jpg',
    ],
    description: 'URLs de fotos del lugar de trabajo',
  })
  photosUrls: string[];

  @ApiProperty({
    type: Number,
    example: 4,
    description: 'Horas estimadas para completar el trabajo',
    minimum: 1,
  })
  estimatedHours: number;

  @ApiProperty({
    type: Number,
    example: 80,
    description: 'Presupuesto mínimo para el trabajo',
    minimum: 20,
  })
  budgetMin: number;

  @ApiProperty({
    type: Number,
    example: 120,
    description: 'Presupuesto máximo para el trabajo',
  })
  budgetMax: number;

  @ApiProperty({
    type: String,
    enum: JobStatus,
    example: JobStatus.PENDING,
    description: 'Estado actual del trabajo',
  })
  status: JobStatus;

  @ApiProperty({
    type: Date,
    description: 'Fecha y hora programada para el trabajo',
  })
  scheduledDate: Date;

  @ApiProperty({
    type: Number,
    example: 100,
    description: 'Precio final acordado',
    nullable: true,
  })
  finalPrice?: number | null;

  @ApiProperty({
    type: Date,
    description: 'Fecha y hora de inicio del trabajo',
    nullable: true,
  })
  startedAt?: Date | null;

  @ApiProperty({
    type: Date,
    description: 'Fecha y hora de finalización del trabajo',
    nullable: true,
  })
  completedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
