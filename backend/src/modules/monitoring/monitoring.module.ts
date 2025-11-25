// Monitoring Module - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { Message } from '../messages/entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Message])],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
