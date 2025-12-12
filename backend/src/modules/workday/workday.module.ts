import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkdayController } from './workday.controller';
import { WorkdayService } from './workday.service';
import { AgentWorkday } from './entities/agent-workday.entity';
import { AgentPause } from './entities/agent-pause.entity';
import { AgentWorkdayEvent } from './entities/agent-workday-event.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgentWorkday,
      AgentPause,
      AgentWorkdayEvent,
      User,
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [WorkdayController],
  providers: [WorkdayService],
  exports: [WorkdayService],
})
export class WorkdayModule {}
