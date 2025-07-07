// src/validate/validate.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios'; // ← AÑADIR ESTA LÍNEA
import { ValidateService } from './services/validate.service';
import { ValidateController } from './controllers/validate.controller';

@Module({
  imports: [
    ConfigModule,
    HttpModule, // ← AÑADIR PARA CONSULTAS EXTERNAS (RENIEC/SUNAT)
  ],
  providers: [ValidateService],
  controllers: [ValidateController],
  exports: [ValidateService], // ← AÑADIR PARA QUE OTROS MÓDULOS PUEDAN USARLO
})
export class ValidateModule {}
