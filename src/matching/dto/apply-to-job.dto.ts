import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ApplyToJobDto {
  @ApiPropertyOptional({
    description: 'Mensaje del trabajador al aplicar al trabajo',
    example:
      'Hola, tengo 5 años de experiencia en plomería y puedo realizar este trabajo hoy mismo.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({
    description: 'Presupuesto propuesto por el trabajador',
    example: 120.0,
  })
  @IsOptional()
  proposedBudget?: number;
}
