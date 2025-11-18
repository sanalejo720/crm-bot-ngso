import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignChatDto {
  @ApiProperty({ example: 'uuid-agent-id' })
  @IsUUID()
  agentId: string;
}

export class TransferChatDto {
  @ApiProperty({ example: 'uuid-new-agent-id' })
  @IsUUID()
  newAgentId: string;

  @ApiProperty({ example: 'Cliente solicita hablar con supervisor' })
  reason: string;
}
