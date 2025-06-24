import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { JobDto } from '../../jobs/dto/job.dto';
import { UserDto } from '../../users/dto/user.dto';

export class JobMatchDto {
  @ApiProperty({
    description: 'ID del match',
    example: 1,
  })
  @Expose()
  id: number;

  @ApiProperty({
    description: 'Información del trabajo',
    type: () => JobDto,
  })
  @Expose()
  @Type(() => JobDto)
  job: JobDto;

  @ApiProperty({
    description: 'Información del trabajador',
    type: () => UserDto,
  })
  @Expose()
  @Type(() => UserDto)
  worker: UserDto;

  @ApiProperty({
    description: 'Puntaje de compatibilidad (0-100)',
    example: 85,
    minimum: 0,
    maximum: 100,
  })
  @Expose()
  score: number;

  @ApiProperty({
    description: 'Distancia en kilómetros',
    example: 2.5,
  })
  @Expose()
  distance: number;

  @ApiProperty({
    description: 'Si el trabajador ya aplicó al trabajo',
    example: false,
  })
  @Expose()
  isApplied: boolean;

  @ApiProperty({
    description: 'Fecha de aplicación si ya aplicó',
    example: '2025-06-18T10:30:00Z',
    required: false,
  })
  @Expose()
  appliedAt?: Date;

  @ApiProperty({
    description: 'Fecha de creación del match',
    example: '2025-06-18T10:00:00Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2025-06-18T10:30:00Z',
  })
  @Expose()
  updatedAt: Date;
}
