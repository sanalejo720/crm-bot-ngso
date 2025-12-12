import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, ValidateIf } from 'class-validator';

export class AssignChatDto {
  @ApiProperty({ example: 'uuid-agent-id', required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  agentId: string | null;

  @ApiProperty({ 
    example: 'Cliente no responde', 
    description: 'Motivo de la transferencia (obligatorio cuando se transfiere al bot)',
    required: false 
  })
  @ValidateIf(o => o.agentId === null)
  @IsString()
  reason?: string;
}

export class TransferChatDto {
  @ApiProperty({ example: 'uuid-new-agent-id' })
  @IsUUID()
  newAgentId: string;

  @ApiProperty({ example: 'Cliente solicita hablar con supervisor' })
  reason: string;
}
