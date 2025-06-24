import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/domain/user';
import databaseConfig from '../../database/config/database.config';
import { DatabaseConfig } from '../../database/config/database-config.type';

const idType = (databaseConfig() as DatabaseConfig).isDocumentDatabase
  ? String
  : Number;

export class UserProfile {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: () => User,
    description: 'Usuario asociado al perfil',
  })
  user: User;

  @ApiProperty({
    type: String,
    example: 'Av. José Larco 123, Miraflores, Lima',
    description: 'Dirección principal del usuario',
  })
  address: string;

  @ApiProperty({
    type: Number,
    example: -12.1267,
    description: 'Latitud de la ubicación',
  })
  latitude: number;

  @ApiProperty({
    type: Number,
    example: -77.0278,
    description: 'Longitud de la ubicación',
  })
  longitude: number;

  @ApiProperty({
    type: Number,
    example: 4.5,
    description: 'Promedio de calificación del usuario',
    minimum: 1,
    maximum: 5,
  })
  ratingAverage: number;

  @ApiProperty({
    type: Number,
    example: 15,
    description: 'Total de trabajos publicados',
  })
  totalJobsPosted: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
