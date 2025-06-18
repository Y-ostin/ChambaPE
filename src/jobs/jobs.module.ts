import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobEntity } from './infrastructure/persistence/relational/entities/job.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { ServiceCategoryEntity } from '../services/infrastructure/persistence/relational/entities/service-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobEntity, UserEntity, ServiceCategoryEntity]),
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
