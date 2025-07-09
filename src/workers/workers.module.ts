import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkersController } from './workers.controller';
import { WorkersService } from './workers.service';
import { WorkerProfileEntity } from '../users/infrastructure/persistence/relational/entities/worker-profile.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { UserProfileEntity } from '../users/infrastructure/persistence/relational/entities/user-profile.entity';
import { ValidateModule } from '../validate/validate.module';
import { ServiceCategoryEntity } from '../services/infrastructure/persistence/relational/entities/service-category.entity';
import { JobEntity } from '../jobs/infrastructure/persistence/relational/entities/job.entity';
import { OffersModule } from '../offers/offers.module';
import { FilesModule } from '../files/files.module';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkerProfileEntity,
      UserEntity,
      UserProfileEntity,
      ServiceCategoryEntity,
      JobEntity,
    ]),
    ValidateModule,
    FilesModule,
    MailModule,
    AuthModule,
    OffersModule,
    UsersModule,
  ],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
