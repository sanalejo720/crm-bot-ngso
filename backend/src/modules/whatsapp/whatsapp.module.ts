import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { WebhookController } from './webhook.controller';
import { WhatsappNumber } from './entities/whatsapp-number.entity';
import { MetaCloudService } from './providers/meta-cloud.service';
import { WppConnectService } from './providers/wppconnect.service';

@Module({
  imports: [TypeOrmModule.forFeature([WhatsappNumber])],
  controllers: [WhatsappController, WebhookController],
  providers: [WhatsappService, MetaCloudService, WppConnectService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
