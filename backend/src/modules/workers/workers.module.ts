import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Chat } from '../chats/entities/chat.entity';
import { ChatsModule } from '../chats/chats.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { GatewayModule } from '../gateway/gateway.module';
import { TimeoutMonitorWorker } from './timeout-monitor.worker';
import { AutoCloseWorker } from './auto-close.worker';

/**
 * Módulo de Workers
 * Contiene los workers/crons que ejecutan tareas automatizadas
 */
@Module({
  imports: [
    ScheduleModule.forRoot(), // Habilitar cron jobs
    TypeOrmModule.forFeature([Chat]),
    ChatsModule, // Para usar ChatStateService, ChatsExportService
    WhatsappModule, // Para enviar notificaciones
    GatewayModule, // Para notificaciones WebSocket
  ],
  providers: [TimeoutMonitorWorker, AutoCloseWorker],
  exports: [TimeoutMonitorWorker, AutoCloseWorker],
})
export class WorkersModule {}
