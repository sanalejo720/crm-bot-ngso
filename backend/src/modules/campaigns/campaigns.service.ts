import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ModuleRef } from '@nestjs/core';
import { Repository } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import { PendingAgentAssignment } from './entities/pending-agent-assignment.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserCampaign } from '../users/entities/user-campaign.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CreateMassCampaignDto } from './dto/create-mass-campaign.dto';
import { ChatsService } from '../chats/chats.service';
import { ChatStatus } from '../chats/entities/chat.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(UserCampaign)
    private userCampaignRepository: Repository<UserCampaign>,
    @InjectRepository(PendingAgentAssignment)
    private pendingAssignmentRepository: Repository<PendingAgentAssignment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private eventEmitter: EventEmitter2,
    private readonly whatsappService: WhatsappService,
    @Inject(forwardRef(() => ChatsService))
    private readonly chatsService: ChatsService,
    private moduleRef: ModuleRef,
  ) {}

  /**
   * Crear nueva campaña
   */
  async create(createCampaignDto: CreateCampaignDto, createdBy: string): Promise<Campaign> {
    this.logger.log(`Creando campaña: ${createCampaignDto.name}`);

    const campaign = this.campaignRepository.create({
      ...createCampaignDto,
      createdBy,
    } as any);

    const saved = await this.campaignRepository.save(campaign);
    const savedCampaign = Array.isArray(saved) ? saved[0] : saved;

    this.eventEmitter.emit('campaign.created', savedCampaign);

    return savedCampaign;
  }

  /**
   * Obtener todas las campañas con filtros
   */
  async findAll(filters?: {
    status?: CampaignStatus;
    search?: string;
  }): Promise<Campaign[]> {
    const query = this.campaignRepository.createQueryBuilder('campaign');

    if (filters?.status) {
      query.andWhere('campaign.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      query.andWhere(
        '(campaign.name LIKE :search OR campaign.description LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    query
      .leftJoinAndSelect('campaign.whatsappNumbers', 'whatsappNumbers')
      .orderBy('campaign.createdAt', 'DESC');

    return query.getMany();
  }

  /**
   * Obtener campañas activas
   */
  async findActive(): Promise<Campaign[]> {
    return this.campaignRepository.find({
      where: { status: CampaignStatus.ACTIVE },
      relations: ['whatsappNumbers'],
    });
  }

  /**
   * Obtener campaña por ID
   */
  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['whatsappNumbers', 'chats', 'debtors'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaña ${id} no encontrada`);
    }

    return campaign;
  }

  /**
   * Actualizar campaña
   */
  async update(id: string, updateCampaignDto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findOne(id);

    Object.assign(campaign, updateCampaignDto);

    const updatedCampaign = await this.campaignRepository.save(campaign);

    this.eventEmitter.emit('campaign.updated', updatedCampaign);

    return updatedCampaign;
  }

  /**
   * Cambiar estado de campaña
   */
  async updateStatus(id: string, status: CampaignStatus): Promise<Campaign> {
    const campaign = await this.findOne(id);

    const oldStatus = campaign.status;
    campaign.status = status;

    const updatedCampaign = await this.campaignRepository.save(campaign);

    this.eventEmitter.emit('campaign.status-changed', {
      campaign: updatedCampaign,
      oldStatus,
      newStatus: status,
    });

    return updatedCampaign;
  }

  /**
   * Actualizar configuración de la campaña
   */
  async updateSettings(
    id: string,
    settings: Record<string, any>,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id);

    campaign.settings = {
      ...campaign.settings,
      ...settings,
    };

    return this.campaignRepository.save(campaign);
  }

  /**
   * Obtener estadísticas de campañas masivas
   */
  async getMassCampaignStats(campaignName?: string) {
    // Construir query base con filtro opcional de campaña
    const baseQuery = this.pendingAssignmentRepository.createQueryBuilder('assignment');
    
    if (campaignName) {
      baseQuery.where('assignment.campaign_name = :campaignName', { campaignName });
    }

    const totalAssignments = await baseQuery.getCount();
    
    const assignedCount = await this.pendingAssignmentRepository
      .createQueryBuilder('assignment')
      .where(campaignName ? 'assignment.campaign_name = :campaignName' : '1=1', { campaignName })
      .andWhere('assignment.assigned = :assigned', { assigned: true })
      .getCount();
    
    const pendingCount = await this.pendingAssignmentRepository
      .createQueryBuilder('assignment')
      .where(campaignName ? 'assignment.campaign_name = :campaignName' : '1=1', { campaignName })
      .andWhere('assignment.assigned = :assigned', { assigned: false })
      .getCount();

    // Obtener asignaciones agrupadas por agente con JOIN a users para nombre
    const assignmentsByAgentQuery = this.pendingAssignmentRepository
      .createQueryBuilder('assignment')
      .leftJoin(User, 'user', 'user.email = assignment.agent_email')
      .select('assignment.agent_email', 'agentEmail')
      .addSelect('user.fullName', 'agentName')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN assignment.assigned = true THEN 1 ELSE 0 END)',
        'assigned',
      )
      .addSelect(
        'SUM(CASE WHEN assignment.assigned = false THEN 1 ELSE 0 END)',
        'pending',
      )
      .groupBy('assignment.agent_email')
      .addGroupBy('user.fullName')
      .orderBy('total', 'DESC');

    if (campaignName) {
      assignmentsByAgentQuery.where('assignment.campaign_name = :campaignName', { campaignName });
    }

    const assignmentsByAgent = await assignmentsByAgentQuery.getRawMany();

    // Obtener lista de campañas únicas para el filtro
    const campaigns = await this.pendingAssignmentRepository
      .createQueryBuilder('assignment')
      .select('DISTINCT assignment.campaign_name', 'campaignName')
      .addSelect('COUNT(*)', 'total')
      .addSelect('MIN(assignment.created_at)', 'createdAt')
      .where('assignment.campaign_name IS NOT NULL')
      .groupBy('assignment.campaign_name')
      .orderBy('MIN(assignment.created_at)', 'DESC')
      .getRawMany();

    return {
      total: totalAssignments,
      assigned: assignedCount,
      pending: pendingCount,
      assignmentRate: totalAssignments > 0 
        ? ((assignedCount / totalAssignments) * 100).toFixed(2) 
        : '0.00',
      byAgent: assignmentsByAgent.map((item) => ({
        agentEmail: item.agentEmail,
        agentName: item.agentName || item.agentEmail, // Fallback a email si no hay nombre
        total: parseInt(item.total),
        assigned: parseInt(item.assigned),
        pending: parseInt(item.pending),
        assignmentRate:
          item.total > 0
            ? ((item.assigned / item.total) * 100).toFixed(2)
            : '0.00',
      })),
      campaigns: campaigns.map((c) => ({
        name: c.campaignName,
        total: parseInt(c.total),
        createdAt: c.createdAt,
      })),
    };
  }

  /**
   * Activar campaña
   */
  async activate(id: string): Promise<Campaign> {
    return this.updateStatus(id, CampaignStatus.ACTIVE);
  }

  /**
   * Pausar campaña
   */
  async pause(id: string): Promise<Campaign> {
    return this.updateStatus(id, CampaignStatus.PAUSED);
  }

  /**
   * Eliminar campaña (soft delete)
   */
  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);
    await this.campaignRepository.softRemove(campaign);

    this.eventEmitter.emit('campaign.deleted', { campaignId: id });

    this.logger.log(`Campaña ${id} eliminada`);
  }

  /**
   * Obtener estadísticas de campaña
   */
  async getStats(id: string) {
    const campaign = await this.findOne(id);

    // Total de chats
    const totalChats = await this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoin('campaign.chats', 'chat')
      .where('campaign.id = :id', { id })
      .getCount();

    // Chats por estado
    const chatsByStatus = await this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoin('campaign.chats', 'chat')
      .select('chat.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('campaign.id = :id', { id })
      .groupBy('chat.status')
      .getRawMany();

    // Total de deudores
    const totalDebtors = await this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoin('campaign.debtors', 'debtor')
      .where('campaign.id = :id', { id })
      .getCount();

    // Deudores por estado
    const debtorsByStatus = await this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoin('campaign.debtors', 'debtor')
      .select('debtor.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('campaign.id = :id', { id })
      .groupBy('debtor.status')
      .getRawMany();

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      totalChats,
      chatsByStatus: chatsByStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      totalDebtors,
      debtorsByStatus: debtorsByStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }

  /**
   * Obtener números de WhatsApp de una campaña
   */
  async getWhatsappNumbers(id: string) {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['whatsappNumbers'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaña ${id} no encontrada`);
    }

    return campaign.whatsappNumbers;
  }

  /**
   * Duplicar campaña
   */
  async duplicate(id: string, newName: string, createdBy: string): Promise<Campaign> {
    const original = await this.findOne(id);

    const duplicated = this.campaignRepository.create({
      name: newName,
      description: original.description ? `${original.description} (Copia)` : undefined,
      status: CampaignStatus.DRAFT,
      settings: { ...original.settings },
      createdBy,
    } as any);

    const saved = await this.campaignRepository.save(duplicated);
    const savedCampaign = Array.isArray(saved) ? saved[0] : saved;

    this.logger.log(`Campaña ${id} duplicada como ${savedCampaign.id}`);

    return savedCampaign;
  }

  /**
   * Obtener campañas asignadas a un usuario (agente)
   * Si el usuario no tiene campañas asignadas, devuelve todas las activas
   */
  async getUserCampaigns(userId: string): Promise<Campaign[]> {
    // Buscar asignaciones del usuario
    const userCampaigns = await this.userCampaignRepository.find({
      where: { userId, isActive: true },
      relations: ['campaign', 'campaign.whatsappNumbers'],
    });

    if (userCampaigns.length > 0) {
      // Devolver solo las campañas activas asignadas al usuario
      return userCampaigns
        .filter(uc => uc.campaign && uc.campaign.status === CampaignStatus.ACTIVE)
        .map(uc => uc.campaign);
    }

    // Si no tiene asignaciones, devolver todas las campañas activas
    return this.findActive();
  }

  /**
   * Envío masivo de mensajes WhatsApp usando plantillas aprobadas
   */
  async sendMassCampaign(dto: CreateMassCampaignDto, userId: number) {
    const batchSize = dto.batchSize || 10;
    const messageDelay = dto.messageDelay || 1000;
    
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`📤 INICIANDO CAMPAÑA MASIVA: ${dto.name}`);
    this.logger.log(`   Total destinatarios: ${dto.recipients.length}`);
    this.logger.log(`   Mensajes por lote: ${batchSize}`);
    this.logger.log(`   Delay entre lotes: ${messageDelay}ms`);
    this.logger.log(`   Plantilla: ${dto.templateSid}`);
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Obtener número de WhatsApp activo para usar (primer número activo)
    const activeNumbers = await this.whatsappService.findAllActive();
    
    if (!activeNumbers || activeNumbers.length === 0) {
      throw new Error('No hay números de WhatsApp activos disponibles');
    }

    const whatsappNumber = activeNumbers[0];
    this.logger.log(`📞 Usando número WhatsApp: ${whatsappNumber.phoneNumber}`);

    // Obtener la campaña activa (usar la primera activa o crear una genérica)
    const activeCampaigns = await this.findActive();
    const campaign = activeCampaigns && activeCampaigns.length > 0 
      ? activeCampaigns[0] 
      : await this.campaignRepository.findOne({ where: {} });

    if (!campaign) {
      throw new Error('No hay campañas disponibles. Crea una campaña primero.');
    }

    this.logger.log(`📋 Usando campaña: ${campaign.name} (${campaign.id})`);

    const results = {
      total: dto.recipients.length,
      sent: 0,
      failed: 0,
      chatsCreated: 0,
      errors: [] as Array<{ phone: string; error: string }>,
    };

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const totalBatches = Math.ceil(dto.recipients.length / batchSize);

    for (let i = 0; i < dto.recipients.length; i += batchSize) {
      const batch = dto.recipients.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      this.logger.log(`\n📦 Lote ${batchNumber}/${totalBatches} (${batch.length} mensajes)`);
      
      await Promise.all(
        batch.map(async (recipient, idx) => {
          try {
            // Validar formato de teléfono
            const phone = recipient.phone.replace(/\D/g, '');
            if (phone.length < 10 || phone.length > 15) {
              throw new Error('Formato de teléfono inválido');
            }

            const fullPhone = `+${phone}`;

            // 1. CREAR CHAT PRIMERO (antes de enviar el mensaje)
            const externalId = `mass_campaign_${dto.name}_${phone}_${Date.now()}`;
            
            let chat;
            try {
              chat = await this.chatsService.create({
                externalId,
                contactPhone: fullPhone,
                contactName: recipient.variables?.['1'] || fullPhone, // Usar nombre si está en variables
                campaignId: campaign.id,
                whatsappNumberId: whatsappNumber.id,
                metadata: {
                  source: 'mass_campaign',
                  campaignName: dto.name,
                  templateSid: dto.templateSid,
                  templateVariables: recipient.variables,
                  sentAt: new Date().toISOString(),
                  agentEmail: recipient.agentEmail,
                  hasClientResponse: false, // Inicialmente sin respuesta
                },
              });
              
              results.chatsCreated++;
              this.logger.log(`   💬 Chat creado: ${chat.id} para ${fullPhone}`);
            } catch (chatError) {
              // Si el chat ya existe, buscar el chat existente para guardar el mensaje
              if (chatError.message?.includes('ya existe')) {
                this.logger.log(`   ℹ️  Chat ya existe para ${fullPhone}, buscando chat existente...`);
                // Buscar chat existente por teléfono usando findActiveByPhone
                const existingChat = await this.chatsService.findActiveByPhone(fullPhone);
                if (existingChat) {
                  chat = existingChat;
                  this.logger.log(`   ✅ Chat existente encontrado: ${chat.id}`);
                }
              } else {
                throw chatError;
              }
            }

            // 2. ENVIAR TEMPLATE
            const sendResult = await this.whatsappService.sendContentTemplate(
              whatsappNumber.id,
              fullPhone,
              dto.templateSid,
              recipient.variables || {},
            );

            // 2.5. GUARDAR MENSAJE ENVIADO (si el chat fue creado)
            if (chat && sendResult?.messageId) {
              try {
                const messagesService = this.moduleRef.get('MessagesService', { strict: false });
                await messagesService.create({
                  chatId: chat.id,
                  externalId: sendResult.messageId,
                  type: 'template',
                  direction: 'outbound',
                  senderType: 'bot',
                  content: `Template: ${dto.templateSid}`,
                  status: 'sent',
                  metadata: {
                    templateSid: dto.templateSid,
                    variables: recipient.variables,
                    campaignName: dto.name,
                  },
                });
                this.logger.log(`   📨 Mensaje guardado: ${sendResult.messageId}`);
              } catch (msgError) {
                this.logger.warn(`   ⚠️  Error guardando mensaje: ${msgError.message}`);
              }
            }

            // 3. Si el destinatario tiene agentEmail, crear asignación pendiente
            if (recipient.agentEmail) {
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

              await this.pendingAssignmentRepository.save({
                phone: fullPhone,
                agentEmail: recipient.agentEmail,
                campaignName: dto.name, // ✅ Guardar nombre de campaña
                templateSid: dto.templateSid,
                expiresAt,
                assigned: false,
              });

              this.logger.log(`   🎯 Asignación pendiente creada: ${phone} → ${recipient.agentEmail} (expira: ${expiresAt.toLocaleDateString()})`);
            }

            results.sent++;
            const msgNum = i + idx + 1;
            this.logger.log(`   ✅ [${msgNum}/${dto.recipients.length}] ${phone} - OK ${sendResult?.messageId ? `(ID: ${sendResult.messageId.substring(0, 15)}...)` : ''}`);
          } catch (error) {
            results.failed++;
            const msgNum = i + idx + 1;
            const errorMsg = error.response?.data?.message || error.message || 'Error desconocido';
            results.errors.push({
              phone: recipient.phone,
              error: errorMsg,
            });
            this.logger.error(`   ❌ [${msgNum}/${dto.recipients.length}] ${recipient.phone} - FAILED: ${errorMsg}`);
          }
        })
      );

      // Delay entre lotes para no saturar
      if (i + batchSize < dto.recipients.length) {
        this.logger.log(`   ⏱️  Esperando ${messageDelay}ms antes del siguiente lote...`);
        await delay(messageDelay);
      }
    }

    const successRate = ((results.sent / results.total) * 100).toFixed(2);
    this.logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`✅ CAMPAÑA COMPLETADA: ${dto.name}`);
    this.logger.log(`   📊 Resultados:`);
    this.logger.log(`      Total: ${results.total}`);
    this.logger.log(`      ✅ Mensajes enviados: ${results.sent}`);
    this.logger.log(`      💬 Chats creados: ${results.chatsCreated}`);
    this.logger.log(`      ❌ Fallidos: ${results.failed}`);
    this.logger.log(`      📈 Tasa de éxito: ${successRate}%`);
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return {
      campaignName: dto.name,
      templateSid: dto.templateSid,
      success: results.failed === 0,
      ...results,
      startedBy: userId,
      completedAt: new Date(),
    };
  }

  /**
   * Validar datos del CSV para envío masivo
   */
  async validateCsvData(csvData: any[]): Promise<{
    valid: boolean;
    errors: string[];
    recipients: Array<{ phone: string; variables: Record<string, string> }>;
  }> {
    const errors: string[] = [];
    const recipients: Array<{ phone: string; variables: Record<string, string> }> = [];

    this.logger.log(`📋 Validando CSV: ${csvData.length} filas detectadas`);

    if (!csvData || csvData.length === 0) {
      return { valid: false, errors: ['El archivo CSV está vacío'], recipients: [] };
    }

    csvData.forEach((row, index) => {
      const rowNum = index + 1;

      // Ignorar filas completamente vacías
      const hasAnyValue = Object.values(row).some(val => val && val.toString().trim() !== '');
      if (!hasAnyValue) {
        this.logger.log(`⏭️  Fila ${rowNum} vacía, ignorando...`);
        return;
      }

      // Validar que tenga teléfono
      if (!row.phone && !row.telefono && !row.numero) {
        errors.push(`Fila ${rowNum}: No se encontró columna de teléfono (phone/telefono/numero)`);
        this.logger.error(`❌ Fila ${rowNum}: Sin columna de teléfono`);
        return;
      }

      const phone = (row.phone || row.telefono || row.numero).toString().replace(/\D/g, '');
      
      if (phone.length < 10 || phone.length > 15) {
        errors.push(`Fila ${rowNum}: Teléfono inválido (${phone})`);
        this.logger.error(`❌ Fila ${rowNum}: Teléfono inválido (${phone})`);
        return;
      }

      // Extraer variables (todas las columnas excepto phone y agentEmail)
      const variables: Record<string, string> = {};
      let agentEmail: string | undefined;
      
      Object.keys(row).forEach((key) => {
        const lowerKey = key.toLowerCase();
        
        if (lowerKey === 'agentemail' || lowerKey === 'agent_email' || lowerKey === 'correo_agente' || lowerKey === 'email_agente') {
          agentEmail = row[key]?.toString().trim();
        } else if (!['phone', 'telefono', 'numero'].includes(lowerKey)) {
          // Mapear nombres de columna a números de variable
          const match = key.match(/var(\d+)|variable(\d+)|(\d+)/i);
          if (match) {
            const varNum = match[1] || match[2] || match[3];
            variables[varNum] = row[key]?.toString() || '';
          } else {
            // Si no tiene número, intentar detectar el orden
            const colIndex = Object.keys(row).filter(k => !['phone', 'telefono', 'numero', 'agentemail', 'agent_email', 'correo_agente', 'email_agente'].includes(k.toLowerCase())).indexOf(key) + 1;
            variables[colIndex.toString()] = row[key]?.toString() || '';
          }
        }
      });

      const recipient: any = { phone, variables };
      if (agentEmail) {
        recipient.agentEmail = agentEmail;
      }
      
      recipients.push(recipient);
      this.logger.log(`✅ Fila ${rowNum}: ${phone} con ${Object.keys(variables).length} variables${agentEmail ? ` [Agente: ${agentEmail}]` : ''}`);
    });

    this.logger.log(`\n📊 Resumen validación: ${recipients.length} destinatarios válidos, ${errors.length} errores`);

    return {
      valid: errors.length === 0 && recipients.length > 0,
      errors,
      recipients,
    };
  }

  /**
   * Buscar asignación pendiente para un número de teléfono
   * Retorna el email del agente si existe una asignación activa y no expirada
   */
  async findPendingAssignment(phone: string): Promise<string | null> {
    try {
      const assignment = await this.pendingAssignmentRepository.findOne({
        where: {
          phone,
          assigned: false,
        },
        order: {
          createdAt: 'DESC', // Tomar la más reciente
        },
      });

      if (!assignment) {
        return null;
      }

      // Verificar si no ha expirado
      const now = new Date();
      if (assignment.expiresAt < now) {
        this.logger.log(`⏰ Asignación pendiente para ${phone} ha expirado (${assignment.expiresAt.toISOString()})`);
        return null;
      }

      this.logger.log(`🎯 Asignación pendiente encontrada: ${phone} → ${assignment.agentEmail}`);
      return assignment.agentEmail;
    } catch (error) {
      this.logger.error(`Error buscando asignación pendiente para ${phone}:`, error);
      return null;
    }
  }

  /**
   * Marcar asignación como completada
   */
  async markAssignmentAsCompleted(phone: string, agentEmail: string): Promise<void> {
    try {
      await this.pendingAssignmentRepository.update(
        {
          phone,
          agentEmail,
          assigned: false,
        },
        {
          assigned: true,
          assignedAt: new Date(),
        },
      );

      this.logger.log(`✅ Asignación marcada como completada: ${phone} → ${agentEmail}`);
    } catch (error) {
      this.logger.error(`Error marcando asignación como completada:`, error);
    }
  }}