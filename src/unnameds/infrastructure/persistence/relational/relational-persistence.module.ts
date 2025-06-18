import { Module } from '@nestjs/common';
import { unnamedRepository } from '../unnamed.repository';
import { unnamedRelationalRepository } from './repositories/unnamed.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { unnamedEntity } from './entities/unnamed.entity';

@Module({
  imports: [TypeOrmModule.forFeature([unnamedEntity])],
  providers: [
    {
      provide: unnamedRepository,
      useClass: unnamedRelationalRepository,
    },
  ],
  exports: [unnamedRepository],
})
export class RelationalunnamedPersistenceModule {}
