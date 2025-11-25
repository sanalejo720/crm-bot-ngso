import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnidentifiedClient } from './entities/unidentified-client.entity';
import { Chat } from '../chats/entities/chat.entity';
import { User } from '../users/entities/user.entity';
import { UnidentifiedClientsController } from './unidentified-clients.controller';
import { UnidentifiedClientsService } from './unidentified-clients.service';

@Module({
  imports: [TypeOrmModule.forFeature([UnidentifiedClient, Chat, User])],
  controllers: [UnidentifiedClientsController],
  providers: [UnidentifiedClientsService],
  exports: [UnidentifiedClientsService],
})
export class UnidentifiedClientsModule {}
