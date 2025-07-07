import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class RegisterWorkerPublicDto {
  @ApiProperty({
    description: 'Email del trabajador',
    example: 'juan.perez@email.com',
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña del trabajador',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Nombre del trabajador',
    example: 'Juan',
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Apellido del trabajador',
    example: 'Pérez',
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Número de DNI',
    example: '12345678',
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  dniNumber: string;

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
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  radiusKm?: number = 15;

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

  @IsOptional()
  @IsString()
  filesMeta?: string;
}
