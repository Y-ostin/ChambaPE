import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { HealthModule } from './health/health.module';
import { HomeModule } from './home/home.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkersModule } from './workers/workers.module';
import { JobsModule } from './jobs/jobs.module';
import { ServicesModule } from './services/services.module';
import { MatchingModule } from './matching/matching.module';
import { OffersModule } from './offers/offers.module';
import { ValidateModule } from './validate/validate.module';
// import { FilesModule } from './files/files.module'; // Comentado temporalmente

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10),
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
      ssl: process.env.DATABASE_SSL_ENABLED === 'true' ? {
        rejectUnauthorized: process.env.DATABASE_REJECT_UNAUTHORIZED === 'true',
      } : false,
    }),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    HttpModule,
    HealthModule,
    HomeModule,
    MailModule,
    AuthModule,
    UsersModule,
    WorkersModule,
    JobsModule,
    ServicesModule,
    MatchingModule,
    OffersModule,
    ValidateModule,
    // FilesModule, // Comentado temporalmente
  ],
})
export class AppModule {}
