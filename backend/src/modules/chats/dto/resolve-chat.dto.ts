import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ResolutionType {
  PAID = 'paid',
  PROMISE = 'promise',
  NO_AGREEMENT = 'no_agreement',
  CALLBACK = 'callback',
}

export class ResolveChatDto {
  @ApiProperty({ enum: ResolutionType, description: 'Tipo de resolución' })
  @IsEnum(ResolutionType)
  resolutionType: ResolutionType;

  // Para pagos
  @ApiPropertyOptional({ description: 'Método de pago' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Monto del pago' })
  @IsNumber()
  @IsOptional()
  paymentAmount?: number;

  // Para promesas
  @ApiPropertyOptional({ description: 'Fecha de promesa de pago' })
  @IsDateString()
  @IsOptional()
  promiseDate?: string;

  @ApiPropertyOptional({ description: 'Monto prometido' })
  @IsNumber()
  @IsOptional()
  promiseAmount?: number;

  @ApiPropertyOptional({ description: 'Método de pago para la promesa' })
  @IsString()
  @IsOptional()
  promisePaymentMethod?: string;

  // Para sin acuerdo
  @ApiPropertyOptional({ description: 'Razón de no acuerdo' })
  @IsString()
  @IsOptional()
  noAgreementReason?: string;

  // Para callback
  @ApiPropertyOptional({ description: 'Fecha de callback' })
  @IsDateString()
  @IsOptional()
  callbackDate?: string;

  @ApiPropertyOptional({ description: 'Notas del callback' })
  @IsString()
  @IsOptional()
  callbackNotes?: string;

  // General
  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Enviar mensaje de cierre' })
  @IsBoolean()
  @IsOptional()
  sendClosingMessage?: boolean;
}
