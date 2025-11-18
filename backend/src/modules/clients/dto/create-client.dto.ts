import { IsString, IsOptional, IsEmail, IsEnum, IsArray, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus } from '../entities/client.entity';

export class CreateClientDto {
  @ApiProperty({ example: '+593987654321' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'Juan' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'juan.perez@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Empresa XYZ' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ example: 'Gerente de Ventas' })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({ example: LeadStatus.NEW, enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  leadStatus?: LeadStatus;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ example: ['vip', 'interesado'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: { edad: 35, ciudad: 'Quito' } })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}
