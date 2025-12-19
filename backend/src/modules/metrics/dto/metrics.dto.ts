import { IsUUID, IsOptional, IsDateString, IsNumber, IsEnum, IsString } from 'class-validator';
import { PaymentSource, PaymentStatus } from '../entities/payment-record.entity';
import { Type } from 'class-transformer';

export class CreatePaymentRecordDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  @IsOptional()
  agentId?: string;

  @IsUUID()
  @IsOptional()
  campaignId?: string;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsDateString()
  paymentDate: string;

  @IsEnum(PaymentSource)
  @IsOptional()
  source?: PaymentSource;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @IsUUID()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class MetricsFilterDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsUUID()
  @IsOptional()
  agentId?: string;

  @IsUUID()
  @IsOptional()
  campaignId?: string;

  @IsString()
  @IsOptional()
  groupBy?: 'day' | 'week' | 'month';
}

export class CollectionMetricsDto {
  totalCollected: number;
  totalDebtAssigned: number;
  recoveryPercentage: number;
  paymentsCount: number;
  averagePayment: number;
}

export class AgentMetricsDto {
  agentId: string;
  agentName: string;
  totalCollected: number;
  totalAssigned: number;
  recoveryPercentage: number;
  paymentsCount: number;
  ranking: number;
}

export class TimeSeriesMetricsDto {
  date: string;
  totalCollected: number;
  paymentsCount: number;
  recoveryPercentage: number;
}
