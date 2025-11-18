import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'uuid-chat-id' })
  @IsUUID()
  chatId: string;

  @ApiProperty({ example: 'Hola, ¿en qué puedo ayudarte?' })
  @IsString()
  content: string;
}

export class SendMediaMessageDto {
  @ApiProperty({ example: 'uuid-chat-id' })
  @IsUUID()
  chatId: string;

  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsString()
  mediaUrl: string;

  @ApiProperty({ example: 'image' })
  @IsString()
  mediaType: 'image' | 'audio' | 'video' | 'document';

  @ApiProperty({ example: 'Mira esta imagen' })
  @IsString()
  caption?: string;
}
