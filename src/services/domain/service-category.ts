import { ApiProperty } from '@nestjs/swagger';
import databaseConfig from '../../database/config/database.config';
import { DatabaseConfig } from '../../database/config/database-config.type';

const idType = (databaseConfig() as DatabaseConfig).isDocumentDatabase
  ? String
  : Number;

export class ServiceCategory {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: String,
    example: 'Limpieza del Hogar',
    description: 'Nombre de la categoría de servicio',
  })
  name: string;

  @ApiProperty({
    type: String,
    example: 'Servicios de limpieza residencial y comercial',
    description: 'Descripción de la categoría',
  })
  description: string;

  @ApiProperty({
    type: String,
    example: 'https://s3.amazonaws.com/chambaipe/icons/cleaning.svg',
    description: 'URL del ícono de la categoría',
  })
  iconUrl?: string;

  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'Estado activo de la categoría',
  })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
