import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Request,
  Post,
  UseGuards,
  Patch,
  Delete,
  SerializeOptions,
  Query,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { AuthForgotPasswordDto } from './dto/auth-forgot-password.dto';
import { AuthConfirmEmailDto } from './dto/auth-confirm-email.dto';
import { AuthResetPasswordDto } from './dto/auth-reset-password.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { NullableType } from '../utils/types/nullable.type';
import { User } from '../users/domain/user';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @SerializeOptions({
    groups: ['me'],
  })
  @Post('email/login')
  @ApiOkResponse({
    type: LoginResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  public login(@Body() loginDto: AuthEmailLoginDto): Promise<LoginResponseDto> {
    return this.service.validateLogin(loginDto);
  }

  @Post('email/register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() createUserDto: AuthRegisterLoginDto,
  ): Promise<{ message: string }> {
    await this.service.register(createUserDto);
    return {
      message: 'Registro exitoso. Revisa tu correo para confirmar la cuenta.',
    };
  }

  @Post('email/register-client')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({
    description: 'Cliente registrado exitosamente con rol user',
  })
  async registerClient(
    @Body() createUserDto: AuthRegisterLoginDto,
  ): Promise<{ message: string }> {
    // Crear usuario con rol user explícitamente
    await this.service.registerWithRole(createUserDto, 'user');
    return {
      message: 'Cliente registrado exitosamente. Revisa tu correo para confirmar la cuenta.',
    };
  }

  @Get('confirm-email')
  @HttpCode(HttpStatus.OK)
  async confirmEmailGet(
    @Query('hash') hash: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.service.confirmEmail(hash);

      // Página que intenta abrir la app y muestra instrucciones
      res.send(`
        <html>
          <head>
            <title>Email Confirmado - ChambaPE</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px; 
                max-width: 600px; 
                margin: 0 auto; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
              }
              .container {
                background: rgba(255,255,255,0.1);
                padding: 30px;
                border-radius: 20px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
              }
              .success { 
                color: #4ade80; 
                font-size: 28px; 
                font-weight: bold;
                margin-bottom: 20px;
              }
              .message { 
                margin: 15px 0; 
                font-size: 16px;
                line-height: 1.5;
              }
              .app-button {
                display: inline-block;
                background: #4ade80;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 25px;
                font-weight: bold;
                margin: 10px;
                transition: all 0.3s ease;
              }
              .app-button:hover {
                background: #22c55e;
                transform: translateY(-2px);
              }
              .manual-instructions {
                background: rgba(255,255,255,0.1);
                padding: 20px;
                border-radius: 15px;
                margin: 20px 0;
                text-align: left;
              }
              .step {
                margin: 10px 0;
                padding: 10px;
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
              }
            </style>
            <script>
              // Intentar abrir la app automáticamente
              function openApp() {
                const appUrl = 'chambape://email-verification?hash=${hash}';
                window.location.href = appUrl;
                
                // Si no se abre la app, mostrar instrucciones manuales
                setTimeout(function() {
                  document.getElementById('manual-instructions').style.display = 'block';
                }, 2000);
              }
              
              // Intentar abrir la app cuando se carga la página
              window.onload = function() {
                openApp();
              };
            </script>
          </head>
          <body>
            <div class="container">
              <div class="success">✅ Email Confirmado Exitosamente</div>
              <div class="message">Tu cuenta ha sido activada. Intentando abrir la app...</div>
              
              <div style="margin: 20px 0;">
                <a href="chambape://email-verification?hash=${hash}" class="app-button">
                  📱 Abrir ChambaPE
                </a>
              </div>
              
              <div id="manual-instructions" class="manual-instructions" style="display: none;">
                <h3>Si la app no se abre automáticamente:</h3>
                <div class="step">1️⃣ Copia este enlace: <code>chambape://email-verification?hash=${hash}</code></div>
                <div class="step">2️⃣ Abre la app ChambaPE en tu móvil</div>
                <div class="step">3️⃣ Pega el enlace en el navegador del móvil</div>
                <div class="step">4️⃣ O simplemente inicia sesión normalmente</div>
              </div>
              
              <div class="message" style="margin-top: 30px;">
                <strong>¿No tienes la app instalada?</strong><br>
                Descarga ChambaPE desde Google Play Store
              </div>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      res.send(`
        <html>
          <head>
            <title>Error de Confirmación - ChambaPE</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px; 
                max-width: 600px; 
                margin: 0 auto; 
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
              }
              .container {
                background: rgba(255,255,255,0.1);
                padding: 30px;
                border-radius: 20px;
                backdrop-filter: blur(10px);
              }
              .error { 
                color: #fca5a5; 
                font-size: 28px; 
                font-weight: bold;
                margin-bottom: 20px;
              }
              .message { 
                margin: 15px 0; 
                font-size: 16px;
                line-height: 1.5;
              }
              .retry-button {
                display: inline-block;
                background: #ef4444;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 25px;
                font-weight: bold;
                margin: 10px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">❌ Error al Confirmar Email</div>
              <div class="message">El enlace de confirmación es inválido o ha expirado.</div>
              <div class="message">Por favor, solicita un nuevo enlace de verificación.</div>
              
              <div style="margin: 20px 0;">
                <a href="/login" class="retry-button">
                  🔄 Ir al Login
                </a>
              </div>
            </div>
          </body>
        </html>
      `);
    }
  }

  @Post('email/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmEmail(
    @Body() confirmEmailDto: AuthConfirmEmailDto,
  ): Promise<void> {
    console.log('🔐 ConfirmEmail endpoint called with hash:', confirmEmailDto.hash);
    try {
      await this.service.confirmEmail(confirmEmailDto.hash);
      console.log('✅ Email confirmed successfully');
    } catch (error) {
      console.error('❌ Error confirming email:', error);
      throw error;
    }
  }

  @Post('email/confirm/new')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmNewEmail(
    @Body() confirmEmailDto: AuthConfirmEmailDto,
  ): Promise<void> {
    return this.service.confirmNewEmail(confirmEmailDto.hash);
  }

  @Post('forgot/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(
    @Body() forgotPasswordDto: AuthForgotPasswordDto,
  ): Promise<void> {
    return this.service.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() resetPasswordDto: AuthResetPasswordDto): Promise<void> {
    return this.service.resetPassword(
      resetPasswordDto.hash,
      resetPasswordDto.password,
    );
  }

  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({
    type: User,
  })
  @HttpCode(HttpStatus.OK)
  public me(@Request() request): Promise<NullableType<User>> {
    return this.service.me(request.user);
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    type: RefreshResponseDto,
  })
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  public refresh(@Request() request): Promise<RefreshResponseDto> {
    return this.service.refreshToken({
      sessionId: request.user.sessionId,
      hash: request.user.hash,
    });
  }

  @ApiBearerAuth()
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(@Request() request): Promise<void> {
    await this.service.logout({
      sessionId: request.user.sessionId,
    });
  }

  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: User,
  })
  public update(
    @Request() request,
    @Body() userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    return this.service.update(request.user, userDto);
  }

  @ApiBearerAuth()
  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  public async delete(@Request() request): Promise<void> {
    return this.service.softDelete(request.user);
  }
}
