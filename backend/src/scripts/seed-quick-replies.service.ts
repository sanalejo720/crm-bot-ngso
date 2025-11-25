// Seed Quick Replies - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuickReply } from '../modules/quick-replies/entities/quick-reply.entity';

@Injectable()
export class QuickRepliesSeedService {
  private readonly logger = new Logger(QuickRepliesSeedService.name);

  constructor(
    @InjectRepository(QuickReply)
    private quickReplyRepository: Repository<QuickReply>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Creando plantillas de mensajes predeterminadas...');

    const templates = [
      {
        shortcut: '/saludo',
        title: 'Saludo Inicial',
        content: 'Hola {{clientName}}, soy {{agentName}} de NGS&O. ¿En qué puedo ayudarte hoy?',
        variables: ['clientName', 'agentName'],
        category: 'Saludo',
      },
      {
        shortcut: '/bienvenida',
        title: 'Bienvenida Formal',
        content: 'Buenos días {{clientName}}, mi nombre es {{agentName}} y te atiendo desde NGS&O Gestión. Estoy aquí para ayudarte.',
        variables: ['clientName', 'agentName'],
        category: 'Saludo',
      },
      {
        shortcut: '/recordatorio',
        title: 'Recordatorio de Deuda',
        content: '{{clientName}}, te recordamos que tienes una deuda pendiente de ${{debtAmount}} con {{daysOverdue}} días de mora. ¿Cuándo podrás realizar el pago?',
        variables: ['clientName', 'debtAmount', 'daysOverdue'],
        category: 'Recordatorio',
      },
      {
        shortcut: '/seguimiento',
        title: 'Seguimiento General',
        content: 'Hola {{clientName}}, te contacto para dar seguimiento a tu caso. ¿Has podido revisar la información que te envié?',
        variables: ['clientName'],
        category: 'Seguimiento',
      },
      {
        shortcut: '/compromiso',
        title: 'Confirmar Compromiso',
        content: 'Perfecto {{clientName}}, confirmamos tu compromiso de pago de ${{debtAmount}} para el día {{paymentDate}}. Te enviaremos un recordatorio.',
        variables: ['clientName', 'debtAmount', 'paymentDate'],
        category: 'Seguimiento',
      },
      {
        shortcut: '/pago',
        title: 'Información de Pago',
        content: 'Para realizar el pago puedes usar:\n\n💳 Transferencia bancaria\n🏦 Pago en sucursal\n📱 PSE\n\n¿Qué método prefieres?',
        variables: [],
        category: 'Informativo',
      },
      {
        shortcut: '/descuento',
        title: 'Oferta de Descuento',
        content: '{{clientName}}, tenemos una oferta especial para ti. Si cancelas tu deuda de ${{debtAmount}} antes del {{expirationDate}}, aplicamos un descuento del {{discountPercent}}%.',
        variables: ['clientName', 'debtAmount', 'expirationDate', 'discountPercent'],
        category: 'Informativo',
      },
      {
        shortcut: '/despedida',
        title: 'Despedida Cordial',
        content: 'Gracias por tu atención {{clientName}}. Quedamos atentos a tu pago. ¡Que tengas excelente día!',
        variables: ['clientName'],
        category: 'Cierre',
      },
      {
        shortcut: '/gracias',
        title: 'Agradecimiento',
        content: '¡Muchas gracias {{clientName}}! Tu pago ha sido registrado exitosamente. Recibirás un comprobante por correo.',
        variables: ['clientName'],
        category: 'Cierre',
      },
      {
        shortcut: '/espera',
        title: 'Solicitar Espera',
        content: '{{clientName}}, dame un momento por favor mientras consulto la información en el sistema.',
        variables: ['clientName'],
        category: 'Informativo',
      },
      {
        shortcut: '/ausente',
        title: 'Mensaje Fuera de Horario',
        content: 'Hola {{clientName}}, en este momento nos encontramos fuera de nuestro horario de atención (Lun-Vie 8am-6pm). Te responderemos a primera hora. Gracias por tu paciencia.',
        variables: ['clientName'],
        category: 'Informativo',
      },
      {
        shortcut: '/noencontrado',
        title: 'No se Encuentra Información',
        content: '{{clientName}}, no encuentro tu información en el sistema. ¿Podrías confirmarme tu número de documento?',
        variables: ['clientName'],
        category: 'Seguimiento',
      },
    ];

    for (const template of templates) {
      const existing = await this.quickReplyRepository.findOne({
        where: { shortcut: template.shortcut },
      });

      if (!existing) {
        const quickReply = this.quickReplyRepository.create({
          ...template,
          userId: null, // Global (disponible para todos)
          campaignId: null, // Disponible para todas las campañas
          isActive: true,
          usageCount: 0,
        });

        await this.quickReplyRepository.save(quickReply);
        this.logger.log(`✅ Plantilla creada: ${template.shortcut} - ${template.title}`);
      } else {
        this.logger.log(`⏭️  Plantilla ya existe: ${template.shortcut}`);
      }
    }

    this.logger.log('✅ Seed de plantillas completado');
  }
}
