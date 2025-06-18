import { unnamed } from '../../../../domain/unnamed';
import { unnamedEntity } from '../entities/unnamed.entity';

export class unnamedMapper {
  static toDomain(raw: unnamedEntity): unnamed {
    const domainEntity = new unnamed();
    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: unnamed): unnamedEntity {
    const persistenceEntity = new unnamedEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
