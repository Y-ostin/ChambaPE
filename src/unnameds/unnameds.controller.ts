import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { unnamedsService } from './unnameds.service';
import { CreateunnamedDto } from './dto/create-unnamed.dto';
import { UpdateunnamedDto } from './dto/update-unnamed.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { unnamed } from './domain/unnamed';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllunnamedsDto } from './dto/find-all-unnameds.dto';

@ApiTags('Unnameds')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'unnameds',
  version: '1',
})
export class unnamedsController {
  constructor(private readonly unnamedsService: unnamedsService) {}

  @Post()
  @ApiCreatedResponse({
    type: unnamed,
  })
  create(@Body() createunnamedDto: CreateunnamedDto) {
    return this.unnamedsService.create(createunnamedDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(unnamed),
  })
  async findAll(
    @Query() query: FindAllunnamedsDto,
  ): Promise<InfinityPaginationResponseDto<unnamed>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.unnamedsService.findAllWithPagination({
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: unnamed,
  })
  findById(@Param('id') id: string) {
    return this.unnamedsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: unnamed,
  })
  update(@Param('id') id: string, @Body() updateunnamedDto: UpdateunnamedDto) {
    return this.unnamedsService.update(id, updateunnamedDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.unnamedsService.remove(id);
  }
}
