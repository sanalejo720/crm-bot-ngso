import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { Message } from './entities/message.entity';
import { ChatsModule } from '../chats/chats.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { WhatsappNumber } from '../whatsapp/entities/whatsapp-number.entity';
import { Client } from '../clients/entities/client.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, WhatsappNumber, Client]),
    ChatsModule,
    WhatsappModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
