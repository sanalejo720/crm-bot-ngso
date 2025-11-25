import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, IsArray } from 'class-validator';
import { BotFlowStatus } from '../entities/bot-flow.entity';

export class CreateBotFlowDto {
  @ApiProperty({ example: 'Flujo de Cobranza' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Flujo para gestión de cobranza automatizada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: BotFlowStatus.DRAFT, enum: BotFlowStatus })
  @IsOptional()
  @IsEnum(BotFlowStatus)
  status?: BotFlowStatus;

  @ApiPropertyOptional({ example: 'node-welcome' })
  @IsOptional()
  @IsString()
  startNodeId?: string;

  @ApiPropertyOptional({
    example: {
      clientName: { name: 'Nombre del cliente', type: 'string', defaultValue: 'Cliente' },
      debtAmount: { name: 'Monto de deuda', type: 'number', defaultValue: 0 },
    },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional({
    example: {
      maxInactivityTime: 300,
      transferToAgentOnError: true,
      fallbackMessage: 'Disculpa, no entendí. ¿Puedes intentar de nuevo?',
    },
  })
  @IsOptional()
  @IsObject()
  settings?: {
    maxInactivityTime?: number;
    transferToAgentOnError?: boolean;
    fallbackMessage?: string;
  };
}

export class UpdateBotFlowDto {
  @ApiPropertyOptional({ example: 'Flujo de Cobranza v2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Flujo actualizado' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: BotFlowStatus.ACTIVE, enum: BotFlowStatus })
  @IsOptional()
  @IsEnum(BotFlowStatus)
  status?: BotFlowStatus;

  @ApiPropertyOptional({ example: 'node-welcome' })
  @IsOptional()
  @IsString()
  startNodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class CreateBotNodeDto {
  @ApiProperty({ example: 'Mensaje de Bienvenida' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'message', enum: ['message', 'menu', 'input', 'condition', 'api_call', 'transfer_agent', 'end'] })
  @IsString()
  type: string;

  @ApiProperty({
    example: {
      message: '¡Hola {{clientName}}! Tienes una deuda de ${{debtAmount}}',
      nextNodeId: 'node-menu',
    },
  })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({ example: 'node-menu' })
  @IsOptional()
  @IsString()
  nextNodeId?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  positionX?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  positionY?: number;
}

export class UpdateBotNodeDto {
  @ApiPropertyOptional({ example: 'Mensaje Actualizado' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextNodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  positionX?: number;

  @ApiPropertyOptional()
  @IsOptional()
  positionY?: number;
}

export class BulkCreateNodesDto {
  @ApiProperty({ type: [CreateBotNodeDto] })
  @IsArray()
  nodes: CreateBotNodeDto[];
}
