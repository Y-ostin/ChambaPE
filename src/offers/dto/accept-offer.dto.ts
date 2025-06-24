import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AcceptOfferDto {
  @ApiProperty({
    description: 'Mensaje de aceptación opcional',
    example: 'Acepto la oferta, estaré disponible en el horario indicado',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
