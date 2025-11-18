import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { User, UserStatus } from '../users/entities/user.entity';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Validar credenciales de usuario
   */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role', 'role.permissions'],
    });

    if (!user) {
      return null;
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Usuario inactivo o suspendido');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  /**
   * Login de usuario
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar 2FA si está habilitado
    if (user.twoFactorEnabled) {
      if (!loginDto.twoFactorCode) {
        throw new UnauthorizedException('Código 2FA requerido');
      }

      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: loginDto.twoFactorCode,
      });

      if (!isValid) {
        throw new UnauthorizedException('Código 2FA inválido');
      }
    }

    const tokens = await this.generateTokens(user);

    // Actualizar refresh token y última conexión
    await this.userRepository.update(user.id, {
      refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
      lastLoginAt: new Date(),
    });

    this.logger.log(`Usuario ${user.email} inició sesión`);

    return {
      ...tokens,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: {
          id: user.role.id,
          name: user.role.name,
          permissions: user.role.permissions.map((p) => ({
            module: p.module,
            action: p.action,
          })),
        },
      },
    };
  }

  /**
   * Registro de nuevo usuario (solo para desarrollo/testing)
   */
  async register(registerDto: RegisterDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      status: UserStatus.ACTIVE,
    });

    return this.userRepository.save(user);
  }

  /**
   * Generar tokens JWT
   */
  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      roleId: user.role.id,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRATION', '1h'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
    });

    return { accessToken, refreshToken };
  }

  /**
   * Refrescar access token
   */
  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions'],
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Token inválido');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isValid) {
      throw new UnauthorizedException('Token inválido');
    }

    return this.generateTokens(user);
  }

  /**
   * Logout
   */
  async logout(userId: string) {
    await this.userRepository.update(userId, {
      refreshToken: null,
    });

    this.logger.log(`Usuario ${userId} cerró sesión`);
  }

  /**
   * Generar secreto para 2FA
   */
  generate2FASecret(email: string) {
    const secret = speakeasy.generateSecret({
      name: `CRM WhatsApp (${email})`,
      length: 32,
    });

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url,
    };
  }

  /**
   * Habilitar 2FA
   */
  async enable2FA(userId: string, secret: string, token: string) {
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
    });

    if (!isValid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }

    await this.userRepository.update(userId, {
      twoFactorSecret: secret,
      twoFactorEnabled: true,
    });

    this.logger.log(`2FA habilitado para usuario ${userId}`);
  }

  /**
   * Deshabilitar 2FA
   */
  async disable2FA(userId: string) {
    await this.userRepository.update(userId, {
      twoFactorSecret: null,
      twoFactorEnabled: false,
    });

    this.logger.log(`2FA deshabilitado para usuario ${userId}`);
  }
}
