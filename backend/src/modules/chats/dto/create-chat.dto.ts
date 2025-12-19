import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsUUID, IsInt, Min } from 'class-validator';
import { ChatStatus } from '../entities/chat.entity';

export class CreateChatDto {
  @ApiProperty({ example: 'whatsapp-external-id-12345' })
  @IsString()
  externalId: string;

  @ApiProperty({ example: '5491134567890' })
  @IsString()
  contactPhone: string;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ example: 'uuid-campaign-id' })
  @IsUUID()
  campaignId: string;

  @ApiProperty({ example: 'uuid-whatsapp-number-id' })
  @IsUUID()
  whatsappNumberId: string;

  @ApiPropertyOptional({ example: ['vip', 'urgente'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 0, description: '0=normal, 1=high, 2=urgent' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ example: 'user@example.com', description: 'Email del usuario asignado' })
  @IsOptional()
  @IsString()
  assignedToUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}
