import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { DocumentType } from '../entities/debtor.entity';

export class CreateDebtorDto {
  @ApiProperty({ example: 'Juan Pérez García' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: DocumentType.CC, enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  documentNumber: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'juan.perez@email.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Calle 123 #45-67' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 1500000 })
  @IsNumber()
  debtAmount: number;

  @ApiProperty({ example: 2000000 })
  @IsNumber()
  initialDebtAmount: number;

  @ApiProperty({ example: 45 })
  @IsNumber()
  daysOverdue: number;

  @ApiPropertyOptional({ example: '2025-01-15' })
  @IsOptional()
  @IsDateString()
  lastPaymentDate?: string;

  @ApiPropertyOptional({ example: '2025-12-30' })
  @IsOptional()
  @IsDateString()
  promiseDate?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'Cliente con historial de cumplimiento' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: {
      producto: 'Crédito Personal',
      numeroCredito: 'CRE-2024-001',
      fechaVencimiento: '2024-12-31',
    },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
