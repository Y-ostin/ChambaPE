import 'dotenv/config';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  // VersioningType, // Comentado para quitar versionado
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';
import validationOptions from './utils/validation-options';
import { AllConfigType } from './config/config.type';
import { ResolvePromisesInterceptor } from './utils/serializer.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<AllConfigType>);

  // Configuración CORS para Flutter y AWS
  app.enableCors({
    origin: true, // Permitir todos los orígenes en desarrollo
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'x-custom-lang',
    ],
    credentials: true,
  });

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.enableShutdownHooks();

  // Quitar el prefijo de API para que las rutas sean directas
  // app.setGlobalPrefix(
  //   configService.getOrThrow('app.apiPrefix', { infer: true }),
  //   {
  //     exclude: ['/'],
  //   },
  // );

  // Versionado completamente deshabilitado
  // app.enableVersioning({
  //   type: VersioningType.URI,
  // });

  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.useGlobalInterceptors(
    // ResolvePromisesInterceptor is used to resolve promises in responses because class-transformer can't do it
    // https://github.com/typestack/class-transformer/issues/549
    new ResolvePromisesInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  const options = new DocumentBuilder()
    .setTitle('ChambaPE API')
    .setDescription('API para la aplicación ChambaPE')
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: process.env.APP_HEADER_LANGUAGE || 'x-custom-lang',
      schema: {
        example: 'es',
      },
    })
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document);

  const port = configService.getOrThrow('app.port', { infer: true });
  await app.listen(port);

  console.log(`🚀 Aplicación ejecutándose en: ${await app.getUrl()}`);
  console.log(`📚 Documentación API disponible en: ${await app.getUrl()}/docs`);
}
void bootstrap();
