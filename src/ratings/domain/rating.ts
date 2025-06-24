import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/domain/user';
import { Job } from '../../jobs/domain/job';
import databaseConfig from '../../database/config/database.config';
import { DatabaseConfig } from '../../database/config/database-config.type';

const idType = (databaseConfig() as DatabaseConfig).isDocumentDatabase
  ? String
  : Number;

export class Rating {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: () => Job,
    description: 'Trabajo relacionado con la calificación',
  })
  job: Job;

  @ApiProperty({
    type: () => User,
    description: 'Usuario que da la calificación',
  })
  fromUser: User;

  @ApiProperty({
    type: () => User,
    description: 'Usuario que recibe la calificación',
  })
  toUser: User;

  @ApiProperty({
    type: Number,
    example: 5,
    description: 'Calificación de 1 a 5 estrellas',
    minimum: 1,
    maximum: 5,
  })
  rating: number;

  @ApiProperty({
    type: String,
    example: 'Excelente trabajo, muy profesional y puntual',
    description: 'Comentario opcional sobre el servicio',
  })
  comment?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
