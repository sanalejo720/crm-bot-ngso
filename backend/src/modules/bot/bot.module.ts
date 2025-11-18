import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotEngineService } from './bot-engine.service';
import { BotController } from './bot.controller';
import { BotFlow } from './entities/bot-flow.entity';
import { BotNode } from './entities/bot-node.entity';
import { MessagesModule } from '../messages/messages.module';
import { ChatsModule } from '../chats/chats.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BotFlow, BotNode]),
    MessagesModule,
    ChatsModule,
  ],
  controllers: [BotController],
  providers: [BotEngineService],
  exports: [BotEngineService],
})
export class BotModule {}
