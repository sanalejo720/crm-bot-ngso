import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { Campaign } from './entities/campaign.entity';
import { PendingAgentAssignment } from './entities/pending-agent-assignment.entity';
import { UserCampaign } from '../users/entities/user-campaign.entity';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ChatsModule } from '../chats/chats.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, UserCampaign, PendingAgentAssignment]),
    WhatsappModule,
    forwardRef(() => ChatsModule),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
