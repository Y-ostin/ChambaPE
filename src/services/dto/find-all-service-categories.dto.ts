import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsBoolean } from 'class-validator';

export class FindAllServiceCategoriesDto {
  @ApiPropertyOptional({
    description: 'Filtrar solo categorías activas',
    example: true,
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Incluir contador de trabajadores por categoría',
    example: true,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeWorkerCount?: boolean = false;
}
