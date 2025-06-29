// src/validate/dto/validate.dto.ts
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ValidateDto {
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsNotEmpty()
  @IsString()
  @Length(8, 8, { message: 'El DNI debe tener 8 dígitos' })
  dni: string;
}
