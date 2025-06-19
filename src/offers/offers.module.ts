import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { OfferEntity } from './infrastructure/persistence/relational/entities/offer.entity';
import { JobEntity } from '../jobs/infrastructure/persistence/relational/entities/job.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { WorkerProfileEntity } from '../users/infrastructure/persistence/relational/entities/worker-profile.entity';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OfferEntity,
      JobEntity,
      UserEntity,
      WorkerProfileEntity,
    ]),
    MatchingModule,
  ],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
