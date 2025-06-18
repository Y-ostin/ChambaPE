import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceCategoryEntity } from '../../../../services/infrastructure/persistence/relational/entities/service-category.entity';
import { ServiceCategorySeedService } from './service-category-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceCategoryEntity])],
  providers: [ServiceCategorySeedService],
  exports: [ServiceCategorySeedService],
})
export class ServiceCategorySeedModule {}
