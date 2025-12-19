import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { Chat } from '../chats/entities/chat.entity';
import { Message } from '../messages/entities/message.entity';
import { User } from '../users/entities/user.entity';
import { AgentSession } from '../users/entities/agent-session.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Client } from '../clients/entities/client.entity';
import { PaymentRecord } from './entities/payment-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Chat,
      Message,
      User,
      AgentSession,
      Campaign,
      Client,
      PaymentRecord,
    ]),
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
