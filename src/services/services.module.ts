import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { ServiceCategoryEntity } from './infrastructure/persistence/relational/entities/service-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceCategoryEntity])],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
