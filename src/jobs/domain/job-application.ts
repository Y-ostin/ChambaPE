import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/domain/user';
import { Job } from './job';
import { JobApplicationStatus } from '../enums/job-status.enum';
import databaseConfig from '../../database/config/database.config';
import { DatabaseConfig } from '../../database/config/database-config.type';

const idType = (databaseConfig() as DatabaseConfig).isDocumentDatabase
  ? String
  : Number;

export class JobApplication {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: () => Job,
    description: 'Trabajo al que se aplica',
  })
  job: Job;

  @ApiProperty({
    type: () => User,
    description: 'Trabajador que aplica al trabajo',
  })
  worker: User;

  @ApiProperty({
    type: String,
    enum: JobApplicationStatus,
    example: JobApplicationStatus.PENDING,
    description: 'Estado de la aplicación',
  })
  status: JobApplicationStatus;

  @ApiProperty({
    type: Number,
    example: 80,
    description: 'Tarifa propuesta por hora',
    minimum: 20,
  })
  proposedRate: number;

  @ApiProperty({
    type: Number,
    example: 4,
    description: 'Tiempo estimado de finalización en horas',
    minimum: 1,
  })
  estimatedCompletionTime: number;

  @ApiProperty({
    type: String,
    example: 'Tengo experiencia en limpieza profunda...',
    description: 'Mensaje del trabajador al aplicar',
  })
  message?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
