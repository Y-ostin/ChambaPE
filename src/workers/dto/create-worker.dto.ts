import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class CreateWorkerDto {
  @ApiProperty({
    description: 'Descripción del trabajador y sus servicios',
    example:
      'Plomero con 5 años de experiencia en reparaciones residenciales y comerciales',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Radio de trabajo en kilómetros',
    example: 15,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  radiusKm?: number = 10;

  @ApiProperty({
    description: 'URL del PDF del Ministerio de Trabajo',
    example: 'https://s3.amazonaws.com/docs/certificado-12345678.pdf',
  })
  @IsOptional()
  @IsString()
  certificatePdfUrl?: string;

  @ApiProperty({
    description: 'Número de DNI',
    example: '12345678',
  })
  @IsOptional()
  @IsString()
  dniNumber?: string;

  @ApiProperty({
    description: 'URL del documento de antecedentes penales',
    example: 'https://s3.amazonaws.com/docs/antecedentes-12345678.pdf',
  })
  @IsOptional()
  @IsString()
  criminalRecordUrl?: string;

  @ApiProperty({
    description: 'URLs de certificados y documentos adicionales',
    example: [
      'https://s3.amazonaws.com/docs/cert1.pdf',
      'https://s3.amazonaws.com/docs/cert2.pdf',
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certificatesUrls?: string[];

  @ApiProperty({
    description: 'IDs de las categorías de servicios que ofrece',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  serviceCategories?: number[];

  @ApiProperty({
    description: 'Dirección completa del trabajador',
    example: 'Av. José Larco 123, Miraflores, Lima',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Latitud de la ubicación del trabajador',
    example: -12.1267,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    description: 'Longitud de la ubicación del trabajador',
    example: -77.0278,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    description: 'URL de la foto frontal del DNI',
    example: 'https://s3.amazonaws.com/docs/dni-frontal-12345678.jpg',
  })
  @IsOptional()
  @IsString()
  dniFrontalUrl?: string;

  @ApiProperty({
    description: 'URL de la foto posterior del DNI',
    example: 'https://s3.amazonaws.com/docs/dni-posterior-12345678.jpg',
  })
  @IsOptional()
  @IsString()
  dniPosteriorUrl?: string;
}
