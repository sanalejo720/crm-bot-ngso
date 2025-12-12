// Create WhatsApp Number DTO - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { IsString, IsIn, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WhatsappProvider } from '../entities/whatsapp-number.entity';

export class CreateWhatsappNumberDto {
  @ApiProperty({ example: '573001234567', description: 'Número de teléfono con código de país' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: 'Línea Principal', description: 'Nombre descriptivo del número' })
  @IsString()
  displayName: string;

  @ApiProperty({ 
    example: WhatsappProvider.WPPCONNECT, 
    description: 'Proveedor de WhatsApp',
    enum: WhatsappProvider 
  })
  @IsIn(['meta', 'wppconnect', 'twilio'])
  provider: WhatsappProvider;

  @ApiPropertyOptional({ example: 'campaign-id', description: 'ID de la campaña asignada' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ example: 'bot-flow-id', description: 'ID del flujo de bot asignado' })
  @IsOptional()
  @IsString()
  botFlowId?: string;

  @ApiPropertyOptional({ example: 'xxx', description: 'Access Token para Meta Cloud API' })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({ example: 'xxx', description: 'Phone Number ID para Meta Cloud API' })
  @IsOptional()
  @IsString()
  phoneNumberId?: string;

  @ApiPropertyOptional({ example: 'session-name', description: 'Session Name para WPPConnect' })
  @IsOptional()
  @IsString()
  sessionName?: string;

  @ApiPropertyOptional({ example: 'ACxxxxx', description: 'Twilio Account SID' })
  @IsOptional()
  @IsString()
  twilioAccountSid?: string;

  @ApiPropertyOptional({ example: 'xxxxxx', description: 'Twilio Auth Token' })
  @IsOptional()
  @IsString()
  twilioAuthToken?: string;

  @ApiPropertyOptional({ example: 'whatsapp:+14155238886', description: 'Twilio Phone Number' })
  @IsOptional()
  @IsString()
  twilioPhoneNumber?: string;

  @ApiPropertyOptional({ example: true, description: 'Si está activo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
