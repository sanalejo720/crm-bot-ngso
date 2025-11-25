// Create Quick Reply DTO - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { IsString, IsOptional, IsArray, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuickReplyDto {
  @ApiProperty({ example: '/saludo', description: 'Shortcut para activar la plantilla' })
  @IsString()
  @MaxLength(50)
  shortcut: string;

  @ApiProperty({ example: 'Saludo Inicial', description: 'Título descriptivo' })
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiProperty({ 
    example: 'Hola {{clientName}}, soy {{agentName}}. ¿En qué puedo ayudarte?',
    description: 'Contenido de la plantilla con variables'
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({ 
    example: ['clientName', 'agentName', 'debtAmount'],
    description: 'Variables disponibles en la plantilla'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ example: 'greeting', description: 'Categoría de la plantilla' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ example: 'campaign-id', description: 'ID de campaña (NULL = global)' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ example: true, description: 'Si está activa' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
