import { ApiProperty } from '@nestjs/swagger';
import { OfferStatus } from '../enums/offer-status.enum';

export class OfferDto {
  @ApiProperty({ example: 1, description: 'ID de la oferta' })
  id: number;

  @ApiProperty({ example: 1, description: 'ID del trabajo' })
  jobId: number;

  @ApiProperty({
    example: 'Reparación de grifo',
    description: 'Título del trabajo',
  })
  jobTitle: string;

  @ApiProperty({
    example: 'Necesito reparar un grifo...',
    description: 'Descripción del trabajo',
  })
  jobDescription: string;

  // NUEVOS CAMPOS PARA DIRECCIÓN Y COORDENADAS DEL TRABAJO
  @ApiProperty({
    example: 'Av. Ejemplo 123, Arequipa',
    description: 'Dirección del trabajo',
  })
  jobAddress: string;

  @ApiProperty({
    example: -16.409,
    description: 'Latitud del trabajo',
    required: false,
  })
  jobLatitude?: number;

  @ApiProperty({
    example: -71.5369,
    description: 'Longitud del trabajo',
    required: false,
  })
  jobLongitude?: number;
  // ... existing code ...

  @ApiProperty({
    example: 'Plomería',
    description: 'Nombre de la categoría de servicio',
  })
  serviceCategoryName: string;

  @ApiProperty({
    example: 'Alta',
    description: 'Nivel de urgencia',
    required: false,
  })
  urgency?: string;

  @ApiProperty({
    example: 6,
    description: 'ID del worker que recibe la oferta',
  })
  workerId: number;

  @ApiProperty({ example: 'Test Worker', description: 'Nombre del worker' })
  workerName: string;

  @ApiProperty({ enum: OfferStatus, example: OfferStatus.PENDING })
  status: OfferStatus;

  @ApiProperty({ example: 75.5, description: 'Presupuesto propuesto' })
  proposedBudget: number;

  @ApiProperty({
    example: 'Hola, tengo disponibilidad para realizar este trabajo',
    description: 'Mensaje de la oferta',
    required: false,
  })
  message?: string;

  @ApiProperty({
    example: 'No tengo disponibilidad en esa fecha',
    description: 'Razón del rechazo',
    required: false,
  })
  rejectionReason?: string;

  @ApiProperty({ example: 85, description: 'Score de matching' })
  matchingScore: number;

  @ApiProperty({ example: 3.2, description: 'Distancia en kilómetros' })
  distance: number;

  @ApiProperty({
    example: '2025-06-19T15:00:00Z',
    description: 'Fecha de creación',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-06-19T16:30:00Z',
    description: 'Fecha de respuesta',
    required: false,
  })
  respondedAt?: Date;

  @ApiProperty({
    example: '2025-06-19T17:00:00Z',
    description: 'Fecha de expiración',
    required: false,
  })
  expiresAt?: Date;
}
