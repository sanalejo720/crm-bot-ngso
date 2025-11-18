import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsUrl,
  IsInt,
  Min,
} from 'class-validator';
import { MessageType, MessageDirection, MessageSenderType } from '../entities/message.entity';

export class CreateMessageDto {
  @ApiProperty({ example: 'uuid-chat-id' })
  @IsUUID()
  chatId: string;

  @ApiProperty({ enum: MessageType })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiProperty({ enum: MessageDirection })
  @IsEnum(MessageDirection)
  direction: MessageDirection;

  @ApiProperty({ enum: MessageSenderType })
  @IsEnum(MessageSenderType)
  senderType: MessageSenderType;

  @ApiPropertyOptional({ example: 'Hola, necesito ayuda' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @ApiPropertyOptional({ example: 'image.jpg' })
  @IsOptional()
  @IsString()
  mediaFileName?: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mediaMimeType?: string;

  @ApiPropertyOptional({ example: 102400 })
  @IsOptional()
  @IsInt()
  @Min(0)
  mediaSize?: number;

  @ApiPropertyOptional({ example: 'wa-msg-12345' })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ example: 'uuid-sender-id' })
  @IsOptional()
  @IsUUID()
  senderId?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}
