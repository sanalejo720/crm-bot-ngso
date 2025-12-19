import { PartialType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';
import { CollectionStatus } from '../enums/collection-status.enum';

import { IsNumber, IsOptional, IsString, IsDate, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @ApiPropertyOptional({ example: 'Juan Perez' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'Juan' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'juan@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Calle 123 #45-67' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'CC' })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({ example: 5000000 })
  @IsOptional()
  @IsNumber()
  debtAmount?: number;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsNumber()
  daysOverdue?: number;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'contacted', enum: CollectionStatus })
  @IsOptional()
  @IsEnum(CollectionStatus)
  collectionStatus?: CollectionStatus;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  promisePaymentDate?: Date;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  promisePaymentAmount?: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  lastPaymentAmount?: number;

  @ApiPropertyOptional({ example: '2025-11-20' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastPaymentDate?: Date;
}
