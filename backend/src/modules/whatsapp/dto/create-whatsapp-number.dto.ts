// Create WhatsApp Number DTO - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
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
  @IsEnum(WhatsappProvider)
  provider: WhatsappProvider;

  @ApiPropertyOptional({ example: 'campaign-id', description: 'ID de la campaña asignada' })
  @IsOptional()
  @IsString()
  campaignId?: string;

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

  @ApiPropertyOptional({ example: true, description: 'Si está activo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
