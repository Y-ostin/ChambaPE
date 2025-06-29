// src/validate/validate.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ValidateService } from './services/validate.service';
import { ValidateController } from './controllers/validate.controller';

@Module({
  imports: [ConfigModule], // ⬅️ AÑADE ESTA LÍNEA
  providers: [ValidateService],
  controllers: [ValidateController],
})
export class ValidateModule {}
