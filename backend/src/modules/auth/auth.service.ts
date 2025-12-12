import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { User, UserStatus, AgentState } from '../users/entities/user.entity';
import { AgentSessionsService } from '../users/services/agent-sessions.service';
import { AgentSessionStatus } from '../users/entities/agent-session.entity';
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
    @Inject(forwardRef(() => AgentSessionsService))
    private agentSessionsService: AgentSessionsService,
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

    // Almacenar refresh token hasheado
    const updateData: any = {
      refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
      lastLoginAt: new Date(),
    };

    // Si es agente, ponerlo disponible automáticamente y crear sesión
    if (user.isAgent) {
      updateData.agentState = AgentState.AVAILABLE;
      
      // Crear sesión de agente para tracking de asistencia
      await this.agentSessionsService.startSession(
        user.id,
        AgentSessionStatus.AVAILABLE,
        loginDto.ipAddress,
        loginDto.userAgent,
      );
      
      this.logger.log(`✅ Agente ${user.email} puesto en estado AVAILABLE y sesión iniciada`);
    }

    await this.userRepository.update(user.id, updateData);

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
            id: p.id,
            name: `${p.module}:${p.action}`,
            module: p.module,
            action: p.action,
            description: p.description,
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
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    const updateData: any = {
      refreshToken: null,
    };

    // Si es agente, ponerlo offline y finalizar sesión
    if (user?.isAgent) {
      updateData.agentState = AgentState.OFFLINE;
      
      // Finalizar sesión activa de agente
      const activeSession = await this.agentSessionsService.getActiveSession(userId);
      if (activeSession) {
        await this.agentSessionsService.endSession(activeSession.id);
      }
      
      this.logger.log(`✅ Agente ${userId} puesto en estado OFFLINE y sesión finalizada`);
    }

    await this.userRepository.update(userId, updateData);

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
