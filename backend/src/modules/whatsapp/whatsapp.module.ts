import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappNumbersController } from './whatsapp-numbers.controller';
import { WhatsappNumbersService } from './whatsapp-numbers.service';
import { WebhookController } from './webhook.controller';
import { WhatsappNumber } from './entities/whatsapp-number.entity';
import { WhatsappNumberCampaign } from './entities/whatsapp-number-campaign.entity';
import { MetaCloudService } from './providers/meta-cloud.service';
import { MetaService } from './providers/meta.service';
import { WppConnectService } from './providers/wppconnect.service';
import { TwilioService } from './providers/twilio.service';
import { TwilioSpamDetectorService } from './services/twilio-spam-detector.service';
import { MessageAuditService } from './services/message-audit.service';
import { Message } from '../messages/entities/message.entity';
import { Chat } from '../chats/entities/chat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WhatsappNumber, WhatsappNumberCampaign, Message, Chat])],
  controllers: [WhatsappController, WhatsappNumbersController, WebhookController],
  providers: [
    WhatsappService, 
    WhatsappNumbersService,
    MetaCloudService, 
    MetaService,
    WppConnectService,
    TwilioService,
    TwilioSpamDetectorService,
    MessageAuditService,
  ],
  exports: [
    WhatsappService, 
    WhatsappNumbersService,
    TwilioSpamDetectorService,
    MessageAuditService,
  ],
})
export class WhatsappModule {}
