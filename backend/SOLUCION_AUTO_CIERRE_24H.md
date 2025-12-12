# SOLUCIÓN 7: Auto-Cierre de Chats Mayores a 24 Horas

## 🕐 AutoCloseWorker - Worker de Cierre Automático por Tiempo

```typescript
// backend/src/modules/workers/auto-close.worker.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Chat, ChatStatus } from '../chats/entities/chat.entity';
import { ChatStateService } from '../chats/services/chat-state.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ChatsExportService } from '../chats/chats-export.service';
import { GatewayService } from '../gateway/gateway.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AutoCloseWorker {
  private readonly logger = new Logger(AutoCloseWorker.name);

  // Configuración: 24 horas en milisegundos
  private readonly AUTO_CLOSE_THRESHOLD_HOURS = 24;
  private readonly BATCH_SIZE = 50; // Procesar en lotes para no sobrecargar

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private chatStateService: ChatStateService,
    private whatsappService: WhatsappService,
    private chatsExportService: ChatsExportService,
    private gatewayService: GatewayService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * 🔄 Ejecutar cada minuto para verificar chats antiguos
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndCloseOldChats() {
    this.logger.log(
      '🕐 [AUTO-CLOSE] Iniciando verificación de chats mayores a 24 horas...',
    );

    try {
      const threshold = new Date(
        Date.now() - this.AUTO_CLOSE_THRESHOLD_HOURS * 60 * 60 * 1000,
      );

      // Buscar chats activos creados hace más de 24 horas
      const oldChats = await this.chatRepository.find({
        where: {
          createdAt: LessThan(threshold),
          status: In([
            ChatStatus.AGENT_ASSIGNED,
            ChatStatus.AGENT_RESPONDING,
            ChatStatus.AGENT_WAITING_CLIENT,
            ChatStatus.BOT_WAITING_QUEUE,
            ChatStatus.BOT_VALIDATING,
            ChatStatus.TRANSFERRING,
          ]),
          autoCloseScheduledAt: null, // No programados previamente
        },
        relations: ['assignedAgent', 'whatsappNumber', 'client', 'campaign'],
        take: this.BATCH_SIZE,
      });

      if (oldChats.length === 0) {
        this.logger.log('✅ [AUTO-CLOSE] No hay chats antiguos para cerrar');
        return;
      }

      this.logger.log(
        `⚠️ [AUTO-CLOSE] Encontrados ${oldChats.length} chats mayores a 24 horas`,
      );

      // Procesar cada chat
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const chat of oldChats) {
        try {
          await this.closeOldChat(chat);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Chat ${chat.id}: ${error.message}`);
          this.logger.error(
            `❌ [AUTO-CLOSE] Error cerrando chat ${chat.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `✅ [AUTO-CLOSE] Procesamiento completado: ${results.success} exitosos, ${results.failed} fallidos`,
      );

      if (results.failed > 0) {
        this.logger.warn(
          `⚠️ [AUTO-CLOSE] Errores encontrados: ${JSON.stringify(results.errors)}`,
        );
      }

      // Emitir evento con métricas
      this.eventEmitter.emit('auto.close.batch.completed', {
        processed: oldChats.length,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `❌ [AUTO-CLOSE] Error crítico en verificación: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * ❌ Cerrar un chat antiguo
   */
  private async closeOldChat(chat: Chat): Promise<void> {
    const ageInHours = Math.floor(
      (Date.now() - chat.createdAt.getTime()) / (1000 * 60 * 60),
    );

    this.logger.log(
      `🔒 [AUTO-CLOSE] Cerrando chat ${chat.id} - Edad: ${ageInHours} horas`,
    );

    try {
      // 1. Generar PDF ANTES de cerrar
      this.logger.log(`📄 [AUTO-CLOSE] Generando PDF para chat ${chat.id}...`);
      const pdfPath = await this.chatsExportService.generateChatPDF(
        chat,
        `Chat cerrado automáticamente por exceder ${this.AUTO_CLOSE_THRESHOLD_HOURS} horas de duración`,
      );
      this.logger.log(`✅ [AUTO-CLOSE] PDF generado: ${pdfPath}`);

      // 2. Enviar mensaje de cierre al cliente
      const farewellMessage = this.getFarewellMessage(ageInHours);
      await this.whatsappService.sendMessage(
        chat.whatsappNumber.sessionName,
        chat.contactPhone,
        farewellMessage,
      );
      this.logger.log(
        `💬 [AUTO-CLOSE] Mensaje de cierre enviado a cliente ${chat.contactPhone}`,
      );

      // 3. Transicionar a cerrado con metadata completa
      await this.chatStateService.transition(
        chat.id,
        ChatStatus.SYSTEM_TIMEOUT,
        undefined,
        {
          reason: `Cierre automático por tiempo - ${ageInHours} horas`,
          triggeredBy: 'system',
          metadata: {
            ageInHours,
            autoCloseThresholdHours: this.AUTO_CLOSE_THRESHOLD_HOURS,
            originalStatus: chat.status,
            hadAssignedAgent: !!chat.assignedAgent,
            agentId: chat.assignedAgent?.id,
            agentName: chat.assignedAgent?.fullName,
            pdfGenerated: pdfPath,
            closedAt: new Date(),
          },
        },
      );

      // 4. Decrementar contador del agente si está asignado
      if (chat.assignedAgent) {
        const agent = chat.assignedAgent;
        agent.currentChatsCount = Math.max(0, agent.currentChatsCount - 1);
        await this.userRepository.save(agent);

        this.logger.log(
          `📉 [AUTO-CLOSE] Contador de ${agent.fullName} actualizado: ${agent.currentChatsCount}`,
        );

        // Notificar al agente por WebSocket
        this.gatewayService.notifyAgentChatClosed(agent.id, {
          chatId: chat.id,
          reason: 'auto_close_24h',
          message: `Chat con ${chat.contactName} cerrado automáticamente (>24h)`,
        });
      }

      // 5. Emitir evento de cierre
      this.eventEmitter.emit('chat.auto.closed', {
        chat,
        ageInHours,
        pdfPath,
      });

      this.logger.log(
        `✅ [AUTO-CLOSE] Chat ${chat.id} cerrado exitosamente después de ${ageInHours} horas`,
      );
    } catch (error) {
      this.logger.error(
        `❌ [AUTO-CLOSE] Error al cerrar chat ${chat.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 💬 Obtener mensaje de despedida personalizado
   */
  private getFarewellMessage(ageInHours: number): string {
    return `⏰ *Tu conversación ha sido cerrada automáticamente*

Tu chat ha estado activo durante ${ageInHours} horas y ha sido cerrado por políticas de tiempo del sistema.

📋 *¿Qué puedes hacer ahora?*
• Si deseas continuar con la gestión de tu cuenta, puedes iniciar una nueva conversación
• Escribe nuevamente y el sistema te atenderá automáticamente
• Un asesor revisará tu caso y te contactará

Gracias por tu comprensión.

*Equipo de Soporte NGSO* 📞`;
  }

  /**
   * 📊 Obtener estadísticas de auto-cierres
   */
  async getAutoCloseStatistics(days: number = 30): Promise<any> {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_auto_closed,
        AVG((metadata->>'ageInHours')::numeric) as avg_age_hours,
        MAX((metadata->>'ageInHours')::numeric) as max_age_hours,
        COUNT(CASE WHEN metadata->>'hadAssignedAgent' = 'true' THEN 1 END) as had_agent,
        COUNT(CASE WHEN metadata->>'hadAssignedAgent' = 'false' THEN 1 END) as no_agent
      FROM chat_state_transitions
      WHERE to_status = 'system_timeout'
        AND reason LIKE 'Cierre automático por tiempo%'
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const results = await this.chatRepository.query(query);

    return {
      period: `${days} days`,
      statistics: results,
      summary: {
        totalAutoClosed: results.reduce((sum, r) => sum + parseInt(r.total_auto_closed), 0),
        avgAgeHours: (
          results.reduce((sum, r) => sum + parseFloat(r.avg_age_hours || 0), 0) /
          results.length
        ).toFixed(2),
      },
    };
  }

  /**
   * 🔍 Obtener chats próximos a auto-cerrar (para dashboard)
   */
  async getChatsNearAutoClose(): Promise<Chat[]> {
    const warningThreshold = new Date(
      Date.now() - (this.AUTO_CLOSE_THRESHOLD_HOURS - 2) * 60 * 60 * 1000, // 2 horas antes
    );

    const chats = await this.chatRepository.find({
      where: {
        createdAt: LessThan(warningThreshold),
        status: In([
          ChatStatus.AGENT_ASSIGNED,
          ChatStatus.AGENT_RESPONDING,
          ChatStatus.AGENT_WAITING_CLIENT,
        ]),
      },
      relations: ['assignedAgent', 'client'],
      order: { createdAt: 'ASC' },
      take: 20,
    });

    return chats.map((chat) => ({
      ...chat,
      hoursActive: Math.floor(
        (Date.now() - chat.createdAt.getTime()) / (1000 * 60 * 60),
      ),
      hoursUntilAutoClose: Math.max(
        0,
        this.AUTO_CLOSE_THRESHOLD_HOURS -
          Math.floor((Date.now() - chat.createdAt.getTime()) / (1000 * 60 * 60)),
      ),
    })) as any;
  }
}
```

## 🎛️ Controller para Auto-Cierre

```typescript
// backend/src/modules/chats/chats.controller.ts

@Controller('chats')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChatsController {
  constructor(
    private autoCloseWorker: AutoCloseWorker,
    // ... otros servicios
  ) {}

  /**
   * 📊 Estadísticas de auto-cierres
   */
  @Get('auto-close/statistics')
  @Permissions('chats:view-statistics')
  async getAutoCloseStatistics(@Query('days') days: number = 30) {
    const stats = await this.autoCloseWorker.getAutoCloseStatistics(days);
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * ⏰ Chats próximos a auto-cerrar (dashboard de supervisores)
   */
  @Get('auto-close/upcoming')
  @Permissions('chats:view-all')
  async getChatsNearAutoClose() {
    const chats = await this.autoCloseWorker.getChatsNearAutoClose();
    return {
      success: true,
      data: chats,
      count: chats.length,
    };
  }
}
```

## 📱 Componente Frontend - Widget de Chats Próximos a Cerrar

```typescript
// frontend/src/components/dashboard/UpcomingAutoCloseWidget.tsx

import React, { useEffect, useState } from 'react';
import { Card, List, Tag, Typography, Alert } from 'antd';
import { ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { chatsApi } from '../../api/chats';

const { Text } = Typography;

interface ChatNearClose {
  id: string;
  contactName: string;
  hoursActive: number;
  hoursUntilAutoClose: number;
  assignedAgent: {
    fullName: string;
  };
}

export const UpcomingAutoCloseWidget: React.FC = () => {
  const [chats, setChats] = useState<ChatNearClose[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChatsNearAutoClose();
    const interval = setInterval(loadChatsNearAutoClose, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, []);

  const loadChatsNearAutoClose = async () => {
    try {
      const response = await chatsApi.getChatsNearAutoClose();
      setChats(response.data);
    } catch (error) {
      console.error('Error cargando chats próximos a cerrar:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (hoursLeft: number) => {
    if (hoursLeft <= 1) return 'red';
    if (hoursLeft <= 3) return 'orange';
    return 'gold';
  };

  return (
    <Card
      title={
        <span>
          <ClockCircleOutlined /> Chats Próximos a Auto-Cerrar (24h)
        </span>
      }
      loading={loading}
      style={{ height: '100%' }}
    >
      {chats.length === 0 ? (
        <Alert
          message="No hay chats próximos a cerrar automáticamente"
          type="success"
          showIcon
        />
      ) : (
        <>
          <Alert
            message={`${chats.length} chat(s) se cerrarán automáticamente pronto`}
            type="warning"
            icon={<WarningOutlined />}
            showIcon
            style={{ marginBottom: 16 }}
          />
          <List
            dataSource={chats}
            renderItem={(chat) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <span>
                      {chat.contactName} -{' '}
                      <Text type="secondary">{chat.assignedAgent.fullName}</Text>
                    </span>
                  }
                  description={
                    <span>
                      Activo {chat.hoursActive}h - Cierre en{' '}
                      <Tag color={getUrgencyColor(chat.hoursUntilAutoClose)}>
                        {chat.hoursUntilAutoClose}h
                      </Tag>
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </>
      )}
    </Card>
  );
};
```

## 📧 Servicio de Notificaciones por Email (Opcional)

```typescript
// backend/src/modules/notifications/auto-close-notification.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AutoCloseNotificationService {
  private readonly logger = new Logger(AutoCloseNotificationService.name);

  constructor(
    private mailerService: MailerService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 📧 Enviar reporte diario de auto-cierres a supervisores
   */
  @OnEvent('auto.close.batch.completed')
  async sendDailyReport(data: any) {
    if (data.success === 0) return; // No enviar si no hubo cierres

    try {
      const supervisors = await this.userRepository.find({
        where: { role: 'supervisor', isActive: true },
      });

      const emailContent = `
        <h2>Reporte de Auto-Cierres (24h)</h2>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
        <p><strong>Chats procesados:</strong> ${data.processed}</p>
        <p><strong>Cerrados exitosamente:</strong> ${data.success}</p>
        <p><strong>Fallidos:</strong> ${data.failed}</p>
        ${
          data.failed > 0
            ? `<h3>Errores:</h3><ul>${data.errors.map((e) => `<li>${e}</li>`).join('')}</ul>`
            : ''
        }
      `;

      for (const supervisor of supervisors) {
        await this.mailerService.sendMail({
          to: supervisor.email,
          subject: `Reporte de Auto-Cierres - ${data.success} chats cerrados`,
          html: emailContent,
        });
      }

      this.logger.log(
        `📧 [AUTO-CLOSE] Reporte enviado a ${supervisors.length} supervisores`,
      );
    } catch (error) {
      this.logger.error(
        `❌ [AUTO-CLOSE] Error enviando reporte: ${error.message}`,
      );
    }
  }
}
```

## 🔧 Registrar Workers en WorkersModule

```typescript
// backend/src/modules/workers/workers.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeoutMonitorWorker } from './timeout-monitor.worker';
import { AutoCloseWorker } from './auto-close.worker';
import { Chat } from '../chats/entities/chat.entity';
import { User } from '../users/entities/user.entity';
import { ChatsModule } from '../chats/chats.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, User]),
    ChatsModule,
    WhatsappModule,
    GatewayModule,
  ],
  providers: [TimeoutMonitorWorker, AutoCloseWorker],
  exports: [TimeoutMonitorWorker, AutoCloseWorker],
})
export class WorkersModule {}
```
