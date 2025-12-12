// Client Identification Service - NGS&O CRM Gestión
// Identificación de clientes por documento desde cualquier número
// Desarrollado por: Alejandro Sandoval - AS Software

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { ClientPhoneNumber } from './entities/client-phone-number.entity';
import { Chat } from '../chats/entities/chat.entity';

@Injectable()
export class ClientIdentificationService {
  private readonly logger = new Logger(ClientIdentificationService.name);

  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(ClientPhoneNumber)
    private phoneRepository: Repository<ClientPhoneNumber>,
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
  ) {}

  /**
   * Identificar cliente por número de documento
   * y vincular el número de WhatsApp si es nuevo
   */
  async identifyClientByDocument(
    documentNumber: string,
    phoneNumber: string,
  ): Promise<{ client: Client; isNewPhone: boolean }> {
    // Buscar cliente por documento
    const client = await this.clientRepository.findOne({
      where: { documentNumber },
      relations: ['phoneNumbers'],
    });

    if (!client) {
      throw new NotFoundException(
        `Cliente con documento ${documentNumber} no encontrado`,
      );
    }

    // Verificar si el número ya está registrado
    let phoneRecord = await this.phoneRepository.findOne({
      where: { clientId: client.id, phoneNumber },
    });

    const isNewPhone = !phoneRecord;

    if (!phoneRecord) {
      // Agregar nuevo número al cliente
      phoneRecord = this.phoneRepository.create({
        clientId: client.id,
        phoneNumber,
        isPrimary: false, // Los números adicionales no son primarios
        isActive: true,
        notes: 'Número agregado automáticamente al contactarse',
        lastContactAt: new Date(),
      });

      await this.phoneRepository.save(phoneRecord);

      this.logger.log(
        `📱 Nuevo número vinculado: ${phoneNumber} → Cliente: ${client.fullName}`,
      );
    } else {
      // Actualizar fecha de último contacto
      phoneRecord.lastContactAt = new Date();
      await this.phoneRepository.save(phoneRecord);
    }

    // Actualizar el teléfono principal del cliente si es diferente
    if (client.phone !== phoneNumber) {
      client.phone = phoneNumber;
      await this.clientRepository.save(client);
      this.logger.log(
        `🔄 Teléfono actualizado para ${client.fullName}: ${phoneNumber}`,
      );
    }

    // Actualizar el chat existente si hay uno
    const activeChat = await this.chatRepository.findOne({
      where: { contactPhone: phoneNumber },
      order: { createdAt: 'DESC' },
    });

    if (activeChat && !activeChat.clientId) {
      activeChat.clientId = client.id;
      await this.chatRepository.save(activeChat);
      this.logger.log(
        `✅ Chat vinculado al cliente identificado: ${client.fullName}`,
      );
    }

    return { client, isNewPhone };
  }

  /**
   * Obtener todos los números de un cliente
   */
  async getClientPhoneNumbers(clientId: string): Promise<ClientPhoneNumber[]> {
    return this.phoneRepository.find({
      where: { clientId, isActive: true },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Buscar cliente por cualquiera de sus números registrados
   */
  async findClientByPhone(phoneNumber: string): Promise<Client | null> {
    const phoneRecord = await this.phoneRepository.findOne({
      where: { phoneNumber, isActive: true },
      relations: ['client'],
    });

    return phoneRecord?.client || null;
  }

  /**
   * Calcular días hábiles desde una fecha
   * (Excluye sábados, domingos y festivos colombianos básicos)
   */
  calculateBusinessDays(startDate: Date, daysToAdd: number): Date {
    const result = new Date(startDate);
    let daysAdded = 0;

    // Festivos fijos de Colombia 2025-2026 (simplificado)
    const holidays = [
      '2025-01-01', // Año Nuevo
      '2025-01-06', // Reyes Magos
      '2025-03-24', // San José
      '2025-04-17', // Jueves Santo
      '2025-04-18', // Viernes Santo
      '2025-05-01', // Día del Trabajo
      '2025-06-02', // Ascensión
      '2025-06-23', // Corpus Christi
      '2025-06-30', // Sagrado Corazón
      '2025-07-20', // Independencia
      '2025-08-07', // Batalla de Boyacá
      '2025-08-18', // Asunción
      '2025-10-13', // Día de la Raza
      '2025-11-03', // Todos los Santos
      '2025-11-17', // Independencia de Cartagena
      '2025-12-08', // Inmaculada Concepción
      '2025-12-25', // Navidad
    ];

    while (daysAdded < daysToAdd) {
      result.setDate(result.getDate() + 1);

      const dayOfWeek = result.getDay();
      const dateStr = result.toISOString().split('T')[0];

      // Saltar sábados (6), domingos (0) y festivos
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateStr)) {
        daysAdded++;
      }
    }

    return result;
  }
}
