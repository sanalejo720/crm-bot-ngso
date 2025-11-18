import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Chat } from '../chats/entities/chat.entity';
import { Message } from '../messages/entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Client } from '../clients/entities/client.entity';
import { Task } from '../tasks/entities/task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, Message, User, Client, Task]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
