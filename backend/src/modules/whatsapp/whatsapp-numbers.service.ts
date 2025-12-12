// WhatsApp Numbers Service - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappNumber, WhatsappProvider } from './entities/whatsapp-number.entity';
import { CreateWhatsappNumberDto } from './dto/create-whatsapp-number.dto';
import { UpdateWhatsappNumberDto } from './dto/update-whatsapp-number.dto';
import { WppConnectService } from './providers/wppconnect.service';
import { MetaService } from './providers/meta.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ConnectionStatus } from './entities/whatsapp-number.entity';
import { ActiveSessionsDto, SessionStatsDto } from './dto/session-stats.dto';

@Injectable()
export class WhatsappNumbersService {
  private readonly MAX_ACTIVE_SESSIONS = 10; // Límite de sesiones simultáneas
  private sessionStats: Map<string, SessionStatsDto> = new Map();

  constructor(
    @InjectRepository(WhatsappNumber)
    private whatsappNumberRepository: Repository<WhatsappNumber>,
    private wppConnectService: WppConnectService,
    private metaService: MetaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Listener: Cuando WPPConnect confirma conexión exitosa
   */
  @OnEvent('whatsapp.session.status')
  async handleSessionStatusChange(data: { sessionName: string; status: string }) {
    if (data.status === 'isLogged' || data.status === 'qrReadSuccess') {
      // Buscar el número por sessionName o phoneNumber
      const number = await this.whatsappNumberRepository.findOne({
        where: [
          { sessionName: data.sessionName },
          { phoneNumber: data.sessionName },
        ],
      });

      if (number) {
        number.status = ConnectionStatus.CONNECTED;
        number.sessionName = data.sessionName; // Guardar el sessionName
        number.lastConnectedAt = new Date();
        await this.whatsappNumberRepository.save(number);

        // Emitir evento de conexión exitosa con el numberId
        this.eventEmitter.emit('whatsapp.session.connected', {
          numberId: number.id,
          sessionName: data.sessionName,
        });
      }
    }
  }

  async create(createDto: CreateWhatsappNumberDto): Promise<WhatsappNumber> {
    // Verificar que el número no exista
    const existing = await this.whatsappNumberRepository.findOne({
      where: { phoneNumber: createDto.phoneNumber },
    });

    if (existing) {
      throw new BadRequestException('Este número ya está registrado');
    }

    // Si es Twilio y tiene credenciales, marcar como conectado automáticamente
    const initialStatus = 
      createDto.provider === WhatsappProvider.TWILIO && 
      createDto.twilioAccountSid && 
      createDto.twilioAuthToken && 
      createDto.twilioPhoneNumber
        ? ConnectionStatus.CONNECTED
        : ConnectionStatus.DISCONNECTED;

    const whatsappNumber = this.whatsappNumberRepository.create({
      phoneNumber: createDto.phoneNumber,
      displayName: createDto.displayName,
      provider: createDto.provider,
      status: initialStatus,
      isActive: createDto.isActive ?? true,
      campaignId: createDto.campaignId,
      botFlowId: createDto.botFlowId,
      accessToken: createDto.accessToken,
      phoneNumberId: createDto.phoneNumberId,
      sessionName: createDto.sessionName,
      twilioAccountSid: createDto.twilioAccountSid,
      twilioAuthToken: createDto.twilioAuthToken,
      twilioPhoneNumber: createDto.twilioPhoneNumber,
    });

    const saved = await this.whatsappNumberRepository.save(whatsappNumber);

    this.eventEmitter.emit('whatsapp.number.created', { number: saved });

    return saved;
  }

  async findAll(): Promise<WhatsappNumber[]> {
    return await this.whatsappNumberRepository.find({
      relations: ['campaign', 'botFlow'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllActive(): Promise<WhatsappNumber[]> {
    return await this.whatsappNumberRepository.find({
      where: { isActive: true },
      relations: ['campaign', 'botFlow'],
    });
  }

  async findOne(id: string): Promise<WhatsappNumber> {
    const number = await this.whatsappNumberRepository.findOne({
      where: { id },
      relations: ['campaign', 'botFlow'],
    });

    if (!number) {
      throw new NotFoundException('Número WhatsApp no encontrado');
    }

    return number;
  }

  async update(id: string, updateDto: UpdateWhatsappNumberDto): Promise<WhatsappNumber> {
    const number = await this.findOne(id);

    Object.assign(number, updateDto);

    return await this.whatsappNumberRepository.save(number);
  }

  async remove(id: string): Promise<void> {
    const number = await this.findOne(id);

    // Desconectar sesión si está conectada
    if (number.status === ConnectionStatus.CONNECTED && number.provider === 'wppconnect') {
      try {
        await this.wppConnectService.closeSession(number.sessionName);
        console.log(`✅ Sesión WPPConnect ${number.sessionName} cerrada antes de eliminar`);
      } catch (error) {
        console.warn(`⚠️ No se pudo cerrar sesión ${number.sessionName}: ${error.message}`);
      }
    }

    // Eliminar número (las relaciones con SET NULL se actualizarán automáticamente)
    await this.whatsappNumberRepository.remove(number);

    this.eventEmitter.emit('whatsapp.number.deleted', { numberId: id });
    console.log(`🗑️ Número WhatsApp ${number.phoneNumber} eliminado exitosamente`);
  }

  /**
   * WPPConnect - Iniciar sesión y obtener QR
   */
  async startWppConnectSession(id: string): Promise<any> {
    const number = await this.findOne(id);

    if (number.provider !== 'wppconnect') {
      throw new BadRequestException('Este número no usa WPPConnect');
    }

    // Actualizar estado a "qr_waiting"
    number.status = ConnectionStatus.QR_WAITING;
    await this.whatsappNumberRepository.save(number);

    try {
      // Pasar el numberId al servicio de WPPConnect para los eventos
      const result = await this.wppConnectService.startSession(number.phoneNumber, id);

      // El QR ya se emitió desde WppConnectService con numberId
      // Solo retornamos el resultado
      return {
        success: true,
        data: {
          qrCode: result.qrCode,
          status: ConnectionStatus.QR_WAITING,
          message: 'Escanea el código QR con WhatsApp',
        },
      };
    } catch (error) {
      number.status = ConnectionStatus.ERROR;
      await this.whatsappNumberRepository.save(number);

      throw new BadRequestException(`Error al iniciar sesión: ${error.message}`);
    }
  }

  /**
   * WPPConnect - Obtener estado de conexión
   */
  async getWppConnectStatus(id: string): Promise<any> {
    const number = await this.findOne(id);

    if (number.provider !== 'wppconnect') {
      throw new BadRequestException('Este número no usa WPPConnect');
    }

    return {
      success: true,
      data: {
        status: number.status,
        phoneNumber: number.phoneNumber,
        sessionName: number.sessionName,
      },
    };
  }

  /**
   * WPPConnect - Desconectar sesión
   */
  async disconnectWppConnect(id: string): Promise<any> {
    const number = await this.findOne(id);

    if (number.provider !== 'wppconnect') {
      throw new BadRequestException('Este número no usa WPPConnect');
    }

    number.status = ConnectionStatus.DISCONNECTED;
    await this.whatsappNumberRepository.save(number);

    this.eventEmitter.emit('whatsapp.session.disconnected', { numberId: id });

    return {
      success: true,
      message: 'Sesión desconectada exitosamente',
    };
  }

  /**
   * Meta Cloud API - Configurar credenciales
   */
  async configureMeta(
    id: string,
    config: { accessToken: string; phoneNumberId: string; businessAccountId: string },
  ): Promise<WhatsappNumber> {
    const number = await this.findOne(id);

    if (number.provider !== 'meta') {
      throw new BadRequestException('Este número no usa Meta Cloud API');
    }

    // Guardar configuración en campos de la entidad
    number.accessToken = config.accessToken;
    number.phoneNumberId = config.phoneNumberId;
    number.status = ConnectionStatus.CONNECTING;
    
    const saved = await this.whatsappNumberRepository.save(number);

    // Verificar conexión inmediatamente
    await this.verifyMetaConnection(id);

    return saved;
  }

  /**
   * Meta Cloud API - Verificar conexión
   */
  async verifyMetaConnection(id: string): Promise<any> {
    const number = await this.findOne(id);

    if (number.provider !== 'meta') {
      throw new BadRequestException('Este número no usa Meta Cloud API');
    }

    if (!number.accessToken || !number.phoneNumberId) {
      throw new BadRequestException('Meta Cloud API no está configurado');
    }

    try {
      const isValid = await this.metaService.verifyToken(
        number.accessToken,
        number.phoneNumberId,
      );

      if (isValid) {
        number.status = ConnectionStatus.CONNECTED;
        number.lastConnectedAt = new Date();
        await this.whatsappNumberRepository.save(number);

        this.eventEmitter.emit('whatsapp.meta.connected', { numberId: id });

        return {
          success: true,
          data: {
            status: ConnectionStatus.CONNECTED,
            message: 'Meta Cloud API configurado correctamente',
          },
        };
      } else {
        throw new Error('Token inválido o sin permisos');
      }
    } catch (error) {
      number.status = ConnectionStatus.ERROR;
      await this.whatsappNumberRepository.save(number);

      return {
        success: false,
        data: {
          status: ConnectionStatus.ERROR,
          message: `Error al verificar Meta API: ${error.message}`,
        },
      };
    }
  }

  /**
   * Asignar número a campaña
   */
  async assignToCampaign(id: string, campaignId: string): Promise<WhatsappNumber> {
    const number = await this.findOne(id);

    number.campaignId = campaignId;
    const saved = await this.whatsappNumberRepository.save(number);

    this.eventEmitter.emit('whatsapp.number.assigned', {
      numberId: id,
      campaignId,
    });

    return saved;
  }

  /**
   * Buscar números por campaña
   */
  async findByCampaign(campaignId: string): Promise<WhatsappNumber[]> {
    return await this.whatsappNumberRepository.find({
      where: { campaignId, isActive: true },
    });
  }

  /**
   * Obtener todas las sesiones activas con estadísticas
   */
  async getActiveSessions(): Promise<ActiveSessionsDto> {
    const allNumbers = await this.whatsappNumberRepository.find({
      where: { isActive: true },
    });

    const sessions: SessionStatsDto[] = [];
    let totalUptime = 0;
    let activeCount = 0;

    for (const number of allNumbers) {
      const stats = this.sessionStats.get(number.id) || {
        numberId: number.id,
        phoneNumber: number.phoneNumber,
        displayName: number.displayName,
        status: number.status,
        isConnected: number.status === ConnectionStatus.CONNECTED,
        messagesSent: 0,
        messagesReceived: 0,
        totalMessages: 0,
        connectedSince: number.lastConnectedAt,
        uptime: 0,
        alertCount: 0,
        offensiveWordsDetected: 0,
      };

      if (stats.isConnected) {
        activeCount++;
        if (stats.uptime) {
          totalUptime += stats.uptime;
        }
      }

      sessions.push(stats);
    }

    return {
      totalSessions: allNumbers.length,
      activeSessions: activeCount,
      maxSessions: this.MAX_ACTIVE_SESSIONS,
      sessions: sessions.sort((a, b) => b.totalMessages - a.totalMessages),
      uptimeAverage: activeCount > 0 ? totalUptime / activeCount : 0,
    };
  }

  /**
   * Cerrar sesión activa manualmente
   */
  async forceCloseSession(id: string): Promise<any> {
    const number = await this.findOne(id);

    if (number.status !== ConnectionStatus.CONNECTED) {
      throw new BadRequestException('Esta sesión no está activa');
    }

    try {
      // Cerrar en WPPConnect si es ese proveedor
      if (number.provider === 'wppconnect') {
        await this.wppConnectService.closeSession(number.phoneNumber);
      }

      // Actualizar estado
      number.status = ConnectionStatus.DISCONNECTED;
      await this.whatsappNumberRepository.save(number);

      // Limpiar estadísticas
      this.sessionStats.delete(id);

      this.eventEmitter.emit('whatsapp.session.force-closed', { numberId: id });

      return {
        success: true,
        message: 'Sesión cerrada exitosamente',
      };
    } catch (error) {
      throw new BadRequestException(`Error al cerrar sesión: ${error.message}`);
    }
  }

  /**
   * Cerrar todas las sesiones activas
   */
  async closeAllSessions(): Promise<any> {
    const activeNumbers = await this.whatsappNumberRepository.find({
      where: { status: ConnectionStatus.CONNECTED },
    });

    const results = {
      total: activeNumbers.length,
      closed: 0,
      errors: 0,
    };

    for (const number of activeNumbers) {
      try {
        await this.forceCloseSession(number.id);
        results.closed++;
      } catch (error) {
        results.errors++;
      }
    }

    return {
      success: true,
      message: `${results.closed} sesiones cerradas exitosamente`,
      results,
    };
  }

  /**
   * Validar si se puede crear una nueva sesión
   */
  async canCreateNewSession(): Promise<{ allowed: boolean; message?: string }> {
    const activeSessions = await this.whatsappNumberRepository.count({
      where: { status: ConnectionStatus.CONNECTED },
    });

    if (activeSessions >= this.MAX_ACTIVE_SESSIONS) {
      return {
        allowed: false,
        message: `Límite de sesiones alcanzado (${activeSessions}/${this.MAX_ACTIVE_SESSIONS}). Cierra algunas sesiones antes de abrir nuevas.`,
      };
    }

    return {
      allowed: true,
    };
  }

  /**
   * Actualizar estadísticas de sesión
   */
  updateSessionStats(
    numberId: string,
    updates: Partial<SessionStatsDto>,
  ): void {
    const current = this.sessionStats.get(numberId) || ({} as SessionStatsDto);
    this.sessionStats.set(numberId, { ...current, ...updates });
  }

  /**
   * Incrementar contador de mensajes
   */
  incrementMessageCount(numberId: string, direction: 'sent' | 'received'): void {
    const stats = this.sessionStats.get(numberId);
    if (stats) {
      if (direction === 'sent') {
        stats.messagesSent++;
      } else {
        stats.messagesReceived++;
      }
      stats.totalMessages = stats.messagesSent + stats.messagesReceived;
      stats.lastMessageAt = new Date();
      this.sessionStats.set(numberId, stats);
    }
  }

  /**
   * Incrementar contador de alertas
   */
  incrementAlertCount(numberId: string): void {
    const stats = this.sessionStats.get(numberId);
    if (stats) {
      stats.alertCount = (stats.alertCount || 0) + 1;
      stats.offensiveWordsDetected = (stats.offensiveWordsDetected || 0) + 1;
      this.sessionStats.set(numberId, stats);
    }
  }

  /**
   * Limpiar procesos zombies de Chromium para una sesión específica
   */
  async cleanupZombieProcesses(id: string): Promise<{ message: string; success: boolean }> {
    const number = await this.whatsappNumberRepository.findOne({ where: { id } });

    if (!number) {
      throw new NotFoundException(`WhatsApp number with ID ${id} not found`);
    }

    if (number.provider !== 'wppconnect') {
      throw new BadRequestException('This operation is only available for WPPConnect sessions');
    }

    try {
      // Cerrar sesión primero si existe
      if (number.sessionName) {
        await this.wppConnectService.closeSession(number.sessionName);
      }

      // Actualizar estado en BD
      number.status = ConnectionStatus.DISCONNECTED;
      await this.whatsappNumberRepository.save(number);

      // Eliminar stats de memoria
      this.sessionStats.delete(id);

      return {
        success: true,
        message: `Procesos zombies limpiados exitosamente para ${number.displayName}`,
      };
    } catch (error) {
      throw new BadRequestException(`Error al limpiar procesos zombies: ${error.message}`);
    }
  }
}
