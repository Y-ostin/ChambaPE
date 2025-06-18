import {
  // common
  Injectable,
} from '@nestjs/common';
import { CreateunnamedDto } from './dto/create-unnamed.dto';
import { UpdateunnamedDto } from './dto/update-unnamed.dto';
import { unnamedRepository } from './infrastructure/persistence/unnamed.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { unnamed } from './domain/unnamed';

@Injectable()
export class unnamedsService {
  constructor(
    // Dependencies here
    private readonly unnamedRepository: unnamedRepository,
  ) {}

  async create(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createunnamedDto: CreateunnamedDto,
  ) {
    // Do not remove comment below.
    // <creating-property />

    return this.unnamedRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.unnamedRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: unnamed['id']) {
    return this.unnamedRepository.findById(id);
  }

  findByIds(ids: unnamed['id'][]) {
    return this.unnamedRepository.findByIds(ids);
  }

  async update(
    id: unnamed['id'],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateunnamedDto: UpdateunnamedDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    return this.unnamedRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
    });
  }

  remove(id: unnamed['id']) {
    return this.unnamedRepository.remove(id);
  }
}
