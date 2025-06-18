import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { unnamedEntity } from '../entities/unnamed.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { unnamed } from '../../../../domain/unnamed';
import { unnamedRepository } from '../../unnamed.repository';
import { unnamedMapper } from '../mappers/unnamed.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class unnamedRelationalRepository implements unnamedRepository {
  constructor(
    @InjectRepository(unnamedEntity)
    private readonly unnamedRepository: Repository<unnamedEntity>,
  ) {}

  async create(data: unnamed): Promise<unnamed> {
    const persistenceModel = unnamedMapper.toPersistence(data);
    const newEntity = await this.unnamedRepository.save(
      this.unnamedRepository.create(persistenceModel),
    );
    return unnamedMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<unnamed[]> {
    const entities = await this.unnamedRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => unnamedMapper.toDomain(entity));
  }

  async findById(id: unnamed['id']): Promise<NullableType<unnamed>> {
    const entity = await this.unnamedRepository.findOne({
      where: { id },
    });

    return entity ? unnamedMapper.toDomain(entity) : null;
  }

  async findByIds(ids: unnamed['id'][]): Promise<unnamed[]> {
    const entities = await this.unnamedRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => unnamedMapper.toDomain(entity));
  }

  async update(id: unnamed['id'], payload: Partial<unnamed>): Promise<unnamed> {
    const entity = await this.unnamedRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.unnamedRepository.save(
      this.unnamedRepository.create(
        unnamedMapper.toPersistence({
          ...unnamedMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return unnamedMapper.toDomain(updatedEntity);
  }

  async remove(id: unnamed['id']): Promise<void> {
    await this.unnamedRepository.delete(id);
  }
}
