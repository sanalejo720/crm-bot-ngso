import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ChatStatus } from '../entities/chat.entity';
import { CreateChatDto } from './create-chat.dto';

export class UpdateChatDto extends PartialType(CreateChatDto) {
  @ApiPropertyOptional({ enum: ChatStatus })
  @IsOptional()
  @IsEnum(ChatStatus)
  status?: ChatStatus;

  @ApiPropertyOptional({ example: 'waiting_for_agent' })
  @IsOptional()
  @IsString()
  subStatus?: string;

  @ApiPropertyOptional({ example: 'uuid-agent-id' })
  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;

  @ApiPropertyOptional({ example: new Date() })
  @IsOptional()
  @Type(() => Date)
  assignedAt?: Date;

  @ApiPropertyOptional({ example: 'uuid-client-id' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    example: {
      sessionId: 'session-123',
      flowId: 'flow-uuid',
      currentNodeId: 'node-uuid',
      variables: {},
      transferredToAgent: false,
    },
  })
  @IsOptional()
  botContext?: {
    sessionId?: string;
    flowId?: string;
    currentNodeId?: string;
    variables?: Record<string, any>;
    transferredToAgent?: boolean;
    autoAssigned?: boolean;
    assignedAgentName?: string;
    closureType?: 'paid' | 'promise';
  };
}
