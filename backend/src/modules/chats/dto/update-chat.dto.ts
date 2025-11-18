import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ChatStatus } from '../entities/chat.entity';
import { CreateChatDto } from './create-chat.dto';

export class UpdateChatDto extends PartialType(CreateChatDto) {
  @ApiPropertyOptional({ enum: ChatStatus })
  @IsOptional()
  @IsEnum(ChatStatus)
  status?: ChatStatus;

  @ApiPropertyOptional({ example: 'uuid-agent-id' })
  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;

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
  };
}
