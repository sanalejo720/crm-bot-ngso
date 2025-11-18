import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './queue.service';
import { QueueProcessor } from './queue.processor';
import { RoundRobinStrategy } from './strategies/round-robin.strategy';
import { LeastBusyStrategy } from './strategies/least-busy.strategy';
import { SkillsBasedStrategy } from './strategies/skills-based.strategy';
import { ChatsModule } from '../chats/chats.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'chat-assignment',
    }),
    ChatsModule,
    UsersModule,
  ],
  providers: [
    QueueService,
    QueueProcessor,
    RoundRobinStrategy,
    LeastBusyStrategy,
    SkillsBasedStrategy,
  ],
  exports: [QueueService],
})
export class QueueModule {}
