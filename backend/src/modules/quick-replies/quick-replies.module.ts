// Quick Replies Module - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuickRepliesController } from './quick-replies.controller';
import { QuickRepliesService } from './quick-replies.service';
import { QuickReply } from './entities/quick-reply.entity';
import { ChatsModule } from '../chats/chats.module';
import { QuickRepliesSeedService } from '../../scripts/seed-quick-replies.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuickReply]),
    ChatsModule,
  ],
  controllers: [QuickRepliesController],
  providers: [QuickRepliesService, QuickRepliesSeedService],
  exports: [QuickRepliesService],
})
export class QuickRepliesModule {}
