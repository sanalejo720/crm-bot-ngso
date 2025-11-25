import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotEngineService } from './bot-engine.service';
import { BotListenerService } from './bot-listener.service';
import { BotFlowsService } from './bot-flows.service';
import { BotController } from './bot.controller';
import { BotFlowsController } from './bot-flows.controller';
import { BotFlow } from './entities/bot-flow.entity';
import { BotNode } from './entities/bot-node.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { MessagesModule } from '../messages/messages.module';
import { ChatsModule } from '../chats/chats.module';
import { DebtorsModule } from '../debtors/debtors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BotFlow, BotNode, Campaign]),
    MessagesModule,
    ChatsModule,
    DebtorsModule,
  ],
  controllers: [BotController, BotFlowsController],
  providers: [BotEngineService, BotListenerService, BotFlowsService],
  exports: [BotEngineService, BotListenerService, BotFlowsService],
})
export class BotModule {}
