import { IsString, IsOptional, IsUUID, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { UnidentifiedClientStatus } from '../entities/unidentified-client.entity';

export class CreateUnidentifiedClientDto {
  @ApiProperty({ description: 'Número de teléfono del cliente', example: '573001234567' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Nombre del cliente' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Tipo de documento' })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({ description: 'Número de documento' })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'ID del chat asociado' })
  @IsOptional()
  @IsUUID()
  chatId?: string;

  @ApiPropertyOptional({ description: 'ID del usuario asignado' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Metadatos adicionales' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateUnidentifiedClientDto extends PartialType(CreateUnidentifiedClientDto) {}

export class UpdateStatusDto {
  @ApiProperty({ enum: UnidentifiedClientStatus })
  @IsEnum(UnidentifiedClientStatus)
  status: UnidentifiedClientStatus;

  @ApiPropertyOptional({ description: 'Notas sobre el cambio de estado' })
  @IsOptional()
  @IsString()
  notes?: string;
}
