import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotEngineService } from './bot-engine.service';
import { BotListenerService } from './bot-listener.service';
import { BotFlowsService } from './bot-flows.service';
import { BotExecutorService } from './bot-executor.service';
import { BotController } from './bot.controller';
import { BotFlowsController } from './bot-flows.controller';
import { BotFlow } from './entities/bot-flow.entity';
import { BotNode } from './entities/bot-node.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Chat } from '../chats/entities/chat.entity';
import { MessagesModule } from '../messages/messages.module';
import { ChatsModule } from '../chats/chats.module';
import { DebtorsModule } from '../debtors/debtors.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BotFlow, BotNode, Campaign, Chat]),
    MessagesModule,
    ChatsModule,
    DebtorsModule,
    WhatsappModule,
  ],
  controllers: [BotController, BotFlowsController],
  providers: [BotEngineService, BotListenerService, BotFlowsService /*, BotExecutorService */],
  exports: [BotEngineService, BotListenerService, BotFlowsService /*, BotExecutorService */],
})
export class BotModule {}
