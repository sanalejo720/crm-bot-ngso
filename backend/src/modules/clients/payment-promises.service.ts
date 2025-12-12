// Payment Promises Service - NGS&O CRM Gestión
// Gestión de promesas de pago y recordatorios
// Desarrollado por: Alejandro Sandoval - AS Software

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Client } from '../clients/entities/client.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { Chat, ChatStatus } from '../chats/entities/chat.entity';

export interface PaymentPromise {
  id: string;
  clientId: string;
  clientName: string;
  phone: string;
  promiseAmount: number;
  promiseDate: Date;
  debtAmount: number;
  daysUntilDue: number;
  chatId?: string;
  whatsappNumberId?: string;
  status: 'upcoming' | 'due-today' | 'overdue';
}

@Injectable()
export class PaymentPromisesService {
  private readonly logger = new Logger(PaymentPromisesService.name);

  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    private whatsappService: WhatsappService,
  ) {}

  /**
   * Obtener promesas próximas a vencer (próximos N días)
   */
  async getUpcomingPromises(daysAhead: number = 7): Promise<PaymentPromise[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const clients = await this.clientRepository.find({
      where: {
        collectionStatus: 'promise',
        promisePaymentDate: Between(today, futureDate),
      },
      relations: ['chats'],
    });

    return this.mapClientsToPromises(clients);
  }

  /**
   * Obtener promesas que vencen HOY
   */
  async getPromisesDueToday(): Promise<PaymentPromise[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const clients = await this.clientRepository.find({
      where: {
        collectionStatus: 'promise',
        promisePaymentDate: Between(today, tomorrow),
      },
      relations: ['chats'],
    });

    return this.mapClientsToPromises(clients);
  }

  /**
   * Obtener promesas vencidas (pasó la fecha y no pagaron)
   */
  async getOverduePromises(): Promise<PaymentPromise[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const clients = await this.clientRepository.find({
      where: {
        collectionStatus: 'promise',
        promisePaymentDate: LessThanOrEqual(today),
      },
      relations: ['chats'],
    });

    return this.mapClientsToPromises(clients);
  }

  /**
   * Marcar promesa como pagada y mover a recuperado
   */
  async markPromiseAsPaid(
    clientId: string,
    actualPaymentAmount?: number,
  ): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id: clientId },
    });

    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    // Actualizar estado a pagado
    client.collectionStatus = 'paid';
    client.lastPaymentDate = new Date();
    client.lastPaymentAmount = actualPaymentAmount || client.promisePaymentAmount || client.debtAmount;

    await this.clientRepository.save(client);

    this.logger.log(`✅ Promesa marcada como pagada: ${client.fullName} - $${client.lastPaymentAmount}`);

    return client;
  }

  /**
   * Enviar recordatorio por WhatsApp a cliente con promesa
   */
  async sendPaymentReminder(
    clientId: string,
    reminderType: 'upcoming' | 'today' | 'overdue',
  ): Promise<boolean> {
    const client = await this.clientRepository.findOne({
      where: { id: clientId },
      relations: ['chats'],
    });

    if (!client || !client.phone) {
      this.logger.warn(`No se puede enviar recordatorio a cliente ${clientId}: sin teléfono`);
      return false;
    }

    // Buscar chat activo del cliente
    const activeChat = client.chats?.find(
      (chat) => chat.status === ChatStatus.ACTIVE || chat.status === ChatStatus.BOT,
    );

    if (!activeChat || !activeChat.whatsappNumberId) {
      this.logger.warn(`No hay chat activo para cliente ${client.fullName}`);
      return false;
    }

    const message = this.generateReminderMessage(client, reminderType);

    try {
      await (this.whatsappService as any).sendMessage(
        activeChat.whatsappNumberId,
        client.phone,
        'text',
        message,
      );

      this.logger.log(`📧 Recordatorio enviado a ${client.fullName} (${reminderType})`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando recordatorio a ${client.fullName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Generar mensaje de recordatorio según tipo
   */
  private generateReminderMessage(
    client: Client,
    type: 'upcoming' | 'today' | 'overdue',
  ): string {
    const amount = client.promisePaymentAmount || client.debtAmount;
    const formattedAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(amount);

    const promiseDate = client.promisePaymentDate
      ? new Date(client.promisePaymentDate).toLocaleDateString('es-CO', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'fecha no especificada';

    if (type === 'today') {
      return `🔔 *Recordatorio de Pago*

Hola ${client.fullName}, 

Te recordamos que *HOY ${promiseDate}* vence tu compromiso de pago por ${formattedAmount}.

Por favor realiza tu pago y envíanos el comprobante para actualizar tu estado.

¡Gracias por tu compromiso! 💚`;
    }

    if (type === 'overdue') {
      return `⚠️ *Promesa de Pago Vencida*

Hola ${client.fullName},

Notamos que tu compromiso de pago del ${promiseDate} por ${formattedAmount} está vencido.

Por favor comunícate con nosotros lo antes posible para regularizar tu situación.

Estamos para ayudarte. 🤝`;
    }

    // upcoming
    const daysUntil = Math.ceil(
      (new Date(client.promisePaymentDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );

    return `📅 *Recordatorio de Promesa de Pago*

Hola ${client.fullName},

Te recordamos que tienes un compromiso de pago próximo:

📆 Fecha: ${promiseDate}
💰 Monto: ${formattedAmount}
⏰ Faltan ${daysUntil} día(s)

Por favor ten listo tu pago para la fecha acordada.

¡Contamos contigo! ✨`;
  }

  /**
   * Mapear clientes a objetos PaymentPromise
   */
  private mapClientsToPromises(clients: Client[]): PaymentPromise[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return clients.map((client) => {
      const promiseDate = new Date(client.promisePaymentDate);
      promiseDate.setHours(0, 0, 0, 0);

      const daysUntilDue = Math.ceil(
        (promiseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      let status: 'upcoming' | 'due-today' | 'overdue' = 'upcoming';
      if (daysUntilDue < 0) status = 'overdue';
      else if (daysUntilDue === 0) status = 'due-today';

      const activeChat = client.chats?.find(
        (chat) => chat.status === ChatStatus.ACTIVE || chat.status === ChatStatus.BOT,
      );

      return {
        id: client.id,
        clientId: client.id,
        clientName: client.fullName || 'Sin nombre',
        phone: client.phone,
        promiseAmount: client.promisePaymentAmount || client.debtAmount,
        promiseDate: client.promisePaymentDate,
        debtAmount: client.debtAmount,
        daysUntilDue,
        chatId: activeChat?.id,
        whatsappNumberId: activeChat?.whatsappNumberId,
        status,
      };
    });
  }

  /**
   * CRON JOB: Enviar recordatorios automáticos todos los días a las 9 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailyReminders() {
    this.logger.log('⏰ Iniciando envío de recordatorios diarios...');

    try {
      // 1. Promesas que vencen HOY
      const today = await this.getPromisesDueToday();
      this.logger.log(`📋 Promesas que vencen HOY: ${today.length}`);

      for (const promise of today) {
        await this.sendPaymentReminder(promise.clientId, 'today');
        // Esperar 2 segundos entre mensajes para no saturar WhatsApp
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // 2. Promesas próximas (próximos 3 días)
      const upcoming = await this.getUpcomingPromises(3);
      const upcomingFiltered = upcoming.filter((p) => p.daysUntilDue > 0 && p.daysUntilDue <= 3);
      
      this.logger.log(`📋 Promesas próximas (1-3 días): ${upcomingFiltered.length}`);

      for (const promise of upcomingFiltered) {
        await this.sendPaymentReminder(promise.clientId, 'upcoming');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // 3. Promesas vencidas
      const overdue = await this.getOverduePromises();
      this.logger.log(`📋 Promesas VENCIDAS: ${overdue.length}`);

      for (const promise of overdue) {
        await this.sendPaymentReminder(promise.clientId, 'overdue');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      this.logger.log('✅ Recordatorios diarios completados');
    } catch (error) {
      this.logger.error(`❌ Error en recordatorios automáticos: ${error.message}`);
    }
  }
}
