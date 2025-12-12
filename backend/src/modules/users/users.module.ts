import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { AgentSession } from './entities/agent-session.entity';
import { UserCampaign } from './entities/user-campaign.entity';
import { AgentSessionsService } from './services/agent-sessions.service';
import { UserCampaignsService } from './services/user-campaigns.service';
import { WorkdayModule } from '../workday/workday.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AgentSession, UserCampaign]),
    forwardRef(() => WorkdayModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, AgentSessionsService, UserCampaignsService],
  exports: [UsersService, AgentSessionsService, UserCampaignsService],
})
export class UsersModule {}
