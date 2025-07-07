import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get('test')
  @ApiOperation({ summary: 'Endpoint de prueba simple' })
  test() {
    return { message: 'Conexión exitosa', timestamp: new Date().toISOString() };
  }
  @Get()
  @ApiOperation({ summary: 'Verificar estado de salud de la API' })
  @ApiResponse({
    status: 200,
    description: 'API funcionando correctamente',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
        uptime: { type: 'number', example: 3600 },
        environment: { type: 'string', example: 'production' },
        version: { type: 'string', example: '1.0.0' },
      },
    },
  })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      service: 'ChambaPE API',
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Verificar si la API está lista para recibir tráfico',
  })
  @ApiResponse({
    status: 200,
    description: 'API lista para recibir tráfico',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ready' },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'boolean', example: true },
            redis: { type: 'boolean', example: true },
            storage: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  ready() {
    // Aquí puedes agregar verificaciones adicionales como:
    // - Conexión a la base de datos
    // - Conexión a Redis
    // - Conexión a servicios externos

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: true, // Implementar verificación real
        redis: true, // Implementar verificación real
        storage: true, // Implementar verificación real
      },
    };
  }

  @Get('info')
  @ApiOperation({ summary: 'Obtener información del sistema' })
  @ApiResponse({
    status: 200,
    description: 'Información del sistema',
    schema: {
      type: 'object',
      properties: {
        nodeVersion: { type: 'string', example: 'v18.17.0' },
        platform: { type: 'string', example: 'linux' },
        arch: { type: 'string', example: 'x64' },
        memory: {
          type: 'object',
          properties: {
            used: { type: 'number', example: 512 },
            total: { type: 'number', example: 2048 },
            free: { type: 'number', example: 1536 },
          },
        },
      },
    },
  })
  info() {
    const memUsage = process.memoryUsage();

    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        free: Math.round(
          (memUsage.heapTotal - memUsage.heapUsed) / 1024 / 1024,
        ),
      },
      pid: process.pid,
      uptime: process.uptime(),
    };
  }
}
