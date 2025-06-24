import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RejectOfferDto {
  @ApiProperty({
    description: 'Razón del rechazo',
    example: 'No tengo disponibilidad en esa fecha y hora',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
