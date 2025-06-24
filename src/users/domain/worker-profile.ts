import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/domain/user';
import databaseConfig from '../../database/config/database.config';
import { DatabaseConfig } from '../../database/config/database-config.type';

const idType = (databaseConfig() as DatabaseConfig).isDocumentDatabase
  ? String
  : Number;

export enum WorkerSubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  PENDING_PAYMENT = 'pending_payment',
}

export class WorkerProfile {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: () => User,
    description: 'Usuario asociado al perfil de trabajador',
  })
  user: User;

  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'Estado de verificación de documentos del trabajador',
  })
  isVerified: boolean;

  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'Disponibilidad del trabajador para el día actual',
  })
  isActiveToday: boolean;

  @ApiProperty({
    type: Number,
    example: 4.8,
    description: 'Promedio de calificación del trabajador',
    minimum: 1,
    maximum: 5,
  })
  ratingAverage: number;

  @ApiProperty({
    type: Number,
    example: 50,
    description: 'Total de trabajos completados',
  })
  totalJobsCompleted: number;

  @ApiProperty({
    type: Number,
    example: 10,
    description: 'Radio de trabajo en kilómetros',
    minimum: 1,
    maximum: 50,
  })
  radiusKm: number;

  @ApiProperty({
    type: String,
    enum: WorkerSubscriptionStatus,
    example: WorkerSubscriptionStatus.ACTIVE,
    description: 'Estado de la suscripción mensual',
  })
  monthlySubscriptionStatus: WorkerSubscriptionStatus;

  @ApiProperty({
    type: Date,
    description: 'Fecha de expiración de la suscripción',
  })
  subscriptionExpiresAt: Date;

  @ApiProperty({
    type: String,
    example: 'https://s3.amazonaws.com/chambaipe/documents/dni_123456.pdf',
    description: 'URL del documento de identidad',
  })
  dniDocumentUrl?: string;

  @ApiProperty({
    type: String,
    example:
      'https://s3.amazonaws.com/chambaipe/documents/antecedentes_123456.pdf',
    description: 'URL de los antecedentes penales',
  })
  criminalRecordUrl?: string;

  @ApiProperty({
    type: [String],
    example: [
      'https://s3.amazonaws.com/chambaipe/certificates/cert1.pdf',
      'https://s3.amazonaws.com/chambaipe/certificates/cert2.pdf',
    ],
    description: 'URLs de certificados y credenciales',
  })
  certificatesUrls: string[];

  @ApiProperty({
    type: String,
    example: '12345678',
    description: 'Número de DNI del trabajador',
  })
  dniNumber?: string;

  @ApiProperty({
    type: String,
    example: 'Tengo 5 años de experiencia en plomería...',
    description: 'Descripción del trabajador',
  })
  description?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
