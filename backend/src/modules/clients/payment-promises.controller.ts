// Payment Promises Controller - NGS&O CRM Gestión
// Endpoints para gestión de promesas de pago
// Desarrollado por: Alejandro Sandoval - AS Software

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PaymentPromisesService } from './payment-promises.service';

@ApiTags('Payment Promises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payment-promises')
export class PaymentPromisesController {
  constructor(
    private readonly paymentPromisesService: PaymentPromisesService,
  ) {}

  @Get('upcoming')
  @ApiOperation({ summary: 'Obtener promesas próximas a vencer' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Días hacia adelante (default: 7)',
  })
  @RequirePermissions({ module: 'clients', action: 'read' })
  async getUpcomingPromises(@Query('days', ParseIntPipe) days: number = 7) {
    const promises = await this.paymentPromisesService.getUpcomingPromises(days);

    return {
      success: true,
      data: promises,
      total: promises.length,
    };
  }

  @Get('due-today')
  @ApiOperation({ summary: 'Obtener promesas que vencen HOY' })
  @RequirePermissions({ module: 'clients', action: 'read' })
  async getPromisesDueToday() {
    const promises = await this.paymentPromisesService.getPromisesDueToday();

    return {
      success: true,
      data: promises,
      total: promises.length,
    };
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Obtener promesas vencidas' })
  @RequirePermissions({ module: 'clients', action: 'read' })
  async getOverduePromises() {
    const promises = await this.paymentPromisesService.getOverduePromises();

    return {
      success: true,
      data: promises,
      total: promises.length,
    };
  }

  @Post(':clientId/send-reminder')
  @ApiOperation({ summary: 'Enviar recordatorio manual a un cliente' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reminderType: {
          type: 'string',
          enum: ['upcoming', 'today', 'overdue'],
          description: 'Tipo de recordatorio',
        },
      },
      required: ['reminderType'],
    },
  })
  @RequirePermissions({ module: 'clients', action: 'update' })
  async sendReminder(
    @Param('clientId') clientId: string,
    @Body('reminderType') reminderType: 'upcoming' | 'today' | 'overdue',
  ) {
    const sent = await this.paymentPromisesService.sendPaymentReminder(
      clientId,
      reminderType,
    );

    return {
      success: sent,
      message: sent
        ? 'Recordatorio enviado exitosamente'
        : 'No se pudo enviar el recordatorio',
    };
  }

  @Patch(':clientId/mark-paid')
  @ApiOperation({ summary: 'Marcar promesa como pagada y mover a recuperado' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        actualPaymentAmount: {
          type: 'number',
          description: 'Monto real del pago (opcional)',
        },
      },
    },
  })
  @RequirePermissions({ module: 'clients', action: 'update' })
  async markPromiseAsPaid(
    @Param('clientId') clientId: string,
    @Body('actualPaymentAmount') actualPaymentAmount?: number,
  ) {
    const client = await this.paymentPromisesService.markPromiseAsPaid(
      clientId,
      actualPaymentAmount,
    );

    return {
      success: true,
      data: client,
      message: 'Promesa marcada como pagada exitosamente',
    };
  }

  @Post('send-daily-reminders')
  @ApiOperation({
    summary: 'Ejecutar manualmente el envío de recordatorios diarios (solo admin)',
  })
  @RequirePermissions({ module: 'clients', action: 'update' })
  async triggerDailyReminders() {
    await this.paymentPromisesService.sendDailyReminders();

    return {
      success: true,
      message: 'Recordatorios diarios enviados',
    };
  }
}
