import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { unnamed } from '../../domain/unnamed';

export abstract class unnamedRepository {
  abstract create(
    data: Omit<unnamed, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<unnamed>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<unnamed[]>;

  abstract findById(id: unnamed['id']): Promise<NullableType<unnamed>>;

  abstract findByIds(ids: unnamed['id'][]): Promise<unnamed[]>;

  abstract update(
    id: unnamed['id'],
    payload: DeepPartial<unnamed>,
  ): Promise<unnamed | null>;

  abstract remove(id: unnamed['id']): Promise<void>;
}
