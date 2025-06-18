import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { JobMatchEntity } from './infrastructure/persistence/relational/entities/job-match.entity';
import { JobEntity } from '../jobs/infrastructure/persistence/relational/entities/job.entity';
import { WorkerProfileEntity } from '../users/infrastructure/persistence/relational/entities/worker-profile.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobMatchEntity,
      JobEntity,
      WorkerProfileEntity,
      UserEntity,
    ]),
  ],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
