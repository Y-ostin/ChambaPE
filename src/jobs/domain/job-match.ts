import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/domain/user';
import { Job } from './job';
import { JobMatchStatus } from '../enums/job-status.enum';
import databaseConfig from '../../database/config/database.config';
import { DatabaseConfig } from '../../database/config/database-config.type';

const idType = (databaseConfig() as DatabaseConfig).isDocumentDatabase
  ? String
  : Number;

export class JobMatch {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: () => Job,
    description: 'Trabajo que coincide con el trabajador',
  })
  job: Job;

  @ApiProperty({
    type: () => User,
    description: 'Trabajador que coincide con el trabajo',
  })
  worker: User;

  @ApiProperty({
    type: Number,
    example: 5.2,
    description: 'Distancia en kilómetros entre trabajador y trabajo',
  })
  distanceKm: number;

  @ApiProperty({
    type: Number,
    example: 85,
    description: 'Puntuación de compatibilidad (0-100)',
    minimum: 0,
    maximum: 100,
  })
  compatibilityScore: number;

  @ApiProperty({
    type: Date,
    description: 'Fecha y hora en que se notificó al trabajador',
  })
  notifiedAt: Date;

  @ApiProperty({
    type: String,
    enum: JobMatchStatus,
    example: JobMatchStatus.PENDING,
    description: 'Estado de la respuesta del trabajador',
  })
  responseStatus: JobMatchStatus;

  @ApiProperty({
    type: Date,
    description: 'Fecha y hora de expiración del match',
  })
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
