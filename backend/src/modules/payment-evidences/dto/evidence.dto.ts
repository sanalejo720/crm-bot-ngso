import { IsUUID, IsNumber, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEvidenceDto {
  @ApiProperty({ description: 'ID del cliente asociado al pago' })
  @IsUUID()
  clientId: string;

  @ApiProperty({ description: 'Monto del pago', example: 50000 })
  @IsNumber()
  paymentAmount: number;

  @ApiProperty({ description: 'Fecha del pago', example: '2025-11-24' })
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional({ description: 'Notas adicionales sobre el pago' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'ID de campaña asociada' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Número de referencia del pago' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;
}

export class ReviewEvidenceDto {
  @ApiProperty({ description: 'Estado de revisión', enum: ['approved', 'rejected'] })
  @IsString()
  status: 'approved' | 'rejected';

  @ApiPropertyOptional({ description: 'Notas de la revisión' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNotes?: string;
}

export class QueryEvidencesDto {
  @ApiPropertyOptional({ description: 'ID del cliente' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Estado', enum: ['pending', 'approved', 'rejected'] })
  @IsOptional()
  @IsString()
  status?: 'pending' | 'approved' | 'rejected';

  @ApiPropertyOptional({ description: 'Fecha inicio' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
