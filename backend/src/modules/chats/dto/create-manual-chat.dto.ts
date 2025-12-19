import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, Matches, MinLength, MaxLength, IsObject } from 'class-validator';

export class CreateManualChatDto {
  @ApiPropertyOptional({ 
    example: '573011234567', 
    description: 'Número de teléfono del contacto (formato internacional sin +)' 
  })
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  @Matches(/^[0-9]+$/, { message: 'El teléfono debe contener solo números' })
  phone: string;

  @ApiPropertyOptional({ 
    example: 'Juan Pérez', 
    description: 'Nombre del contacto (opcional)' 
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @ApiPropertyOptional({ 
    example: 'uuid-campaign-id', 
    description: 'ID de la campaña (opcional, se usa la campaña del agente si no se especifica)' 
  })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ 
    example: 'uuid-agent-id', 
    description: 'ID del agente a asignar (solo admin/supervisor, opcional)' 
  })
  @IsOptional()
  @IsUUID()
  assignToAgentId?: string;

  @ApiPropertyOptional({ 
    example: 'Hola, me comunico desde NGS&O para...',
    description: 'Mensaje inicial a enviar (opcional)' 
  })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  initialMessage?: string;

  @ApiPropertyOptional({ 
    example: 'HX87f380266edfc0d2c150932e7c716d16',
    description: 'Content SID de la plantilla de Twilio a enviar' 
  })
  @IsOptional()
  @IsString()
  templateSid?: string;

  @ApiPropertyOptional({ 
    example: { '1': 'Juan', '2': '500000', '3': '15 días' },
    description: 'Variables para la plantilla ({{1}}, {{2}}, etc.)' 
  })
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, string>;
}
