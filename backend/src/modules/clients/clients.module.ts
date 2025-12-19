import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { PaymentPromisesController } from './payment-promises.controller';
import { PaymentPromisesService } from './payment-promises.service';
import { PazYSalvoController } from './paz-y-salvo.controller';
import { PazYSalvoService } from './paz-y-salvo.service';
import { ClientIdentificationService } from './client-identification.service';
import { Client } from './entities/client.entity';
import { ClientPhoneNumber } from './entities/client-phone-number.entity';
import { PazYSalvo } from './entities/paz-y-salvo.entity';
import { Chat } from '../chats/entities/chat.entity';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { PaymentRecord } from '../metrics/entities/payment-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, ClientPhoneNumber, PazYSalvo, Chat, PaymentRecord]),
    forwardRef(() => WhatsappModule),
  ],
  controllers: [ClientsController, PaymentPromisesController, PazYSalvoController],
  providers: [
    ClientsService, 
    PaymentPromisesService, 
    ClientIdentificationService,
    PazYSalvoService,
  ],
  exports: [
    ClientsService, 
    PaymentPromisesService, 
    ClientIdentificationService,
    PazYSalvoService,
  ],
})
export class ClientsModule {}
