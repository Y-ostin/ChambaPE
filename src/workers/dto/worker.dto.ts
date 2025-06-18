import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { User } from '../../users/domain/user';

export class WorkerDto {
  @ApiProperty({
    type: Number,
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Información del usuario',
    type: () => User,
  })
  @Type(() => User)
  user: User;

  @ApiProperty({
    description: 'Descripción del trabajador',
    example: 'Plomero con 5 años de experiencia',
  })
  description?: string;

  @ApiProperty({
    description: 'Radio de trabajo en kilómetros',
    example: 15,
  })
  radiusKm: number;

  @ApiProperty({
    description: 'Promedio de calificaciones',
    example: 4.5,
  })
  ratingAverage: number;

  @ApiProperty({
    description: 'Total de trabajos completados',
    example: 25,
  })
  totalJobsCompleted: number;

  @ApiProperty({
    description: 'Está verificado',
    example: true,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Está activo hoy',
    example: true,
  })
  isActiveToday: boolean;

  @ApiProperty({
    description: 'Estado de suscripción mensual',
    example: 'active',
  })
  monthlySubscriptionStatus: string;

  @ApiProperty({
    description: 'Fecha de expiración de suscripción',
    example: '2025-07-17',
    nullable: true,
  })
  subscriptionExpiresAt?: Date;

  @ApiProperty({
    description: 'URLs de certificados',
    example: ['cert1.pdf', 'cert2.pdf'],
    type: [String],
    required: false,
  })
  certificatesUrls?: string[];

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
