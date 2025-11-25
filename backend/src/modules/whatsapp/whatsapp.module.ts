import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappNumbersController } from './whatsapp-numbers.controller';
import { WhatsappNumbersService } from './whatsapp-numbers.service';
import { WebhookController } from './webhook.controller';
import { WhatsappNumber } from './entities/whatsapp-number.entity';
import { MetaCloudService } from './providers/meta-cloud.service';
import { MetaService } from './providers/meta.service';
import { WppConnectService } from './providers/wppconnect.service';

@Module({
  imports: [TypeOrmModule.forFeature([WhatsappNumber])],
  controllers: [WhatsappController, WhatsappNumbersController, WebhookController],
  providers: [
    WhatsappService, 
    WhatsappNumbersService,
    MetaCloudService, 
    MetaService,
    WppConnectService
  ],
  exports: [WhatsappService, WhatsappNumbersService],
})
export class WhatsappModule {}
