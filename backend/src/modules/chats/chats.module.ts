import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsService } from './chats.service';
import { ChatsExportService } from './chats-export.service';
import { ChatsController } from './chats.controller';
import { Chat } from './entities/chat.entity';
import { ChatStateTransition } from './entities/chat-state-transition.entity';
import { Message } from '../messages/entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Debtor } from '../debtors/entities/debtor.entity';
import { UsersModule } from '../users/users.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { EvidencesModule } from '../evidences/evidences.module';
import { EmailService } from '../../common/services/email.service';
import { ChatStateService } from './services/chat-state.service';
import { AssignmentService } from './services/assignment.service';
import { ReturnToBotService } from './services/return-to-bot.service';
import { TransferService } from './services/transfer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, ChatStateTransition, Message, User, Debtor]),
    UsersModule,
    forwardRef(() => WhatsappModule),
    EvidencesModule,
  ],
  controllers: [ChatsController],
  providers: [
    ChatsService,
    ChatsExportService,
    EmailService,
    ChatStateService,
    AssignmentService,
    ReturnToBotService,
    TransferService,
  ],
  exports: [
    ChatsService,
    ChatsExportService,
    ChatStateService,
    AssignmentService,
    ReturnToBotService,
    TransferService,
  ],
})
export class ChatsModule {}
