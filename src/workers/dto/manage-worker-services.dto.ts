import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, ArrayMinSize } from 'class-validator';

export class ManageWorkerServicesDto {
  @ApiProperty({
    description: 'IDs de las categorías de servicios a asignar al trabajador',
    example: [1, 3, 5],
    isArray: true,
    type: Number,
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  serviceCategoryIds: number[];
}
