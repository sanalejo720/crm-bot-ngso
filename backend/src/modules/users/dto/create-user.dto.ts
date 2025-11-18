import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  IsUUID,
} from 'class-validator';
import { UserStatus } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'juan.perez@company.com' })
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '+5491134567890' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ example: 'uuid-role-id' })
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({ example: 'uuid-campaign-id' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ example: 5, description: 'Máximo de chats concurrentes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxConcurrentChats?: number;

  @ApiPropertyOptional({ example: ['ventas', 'soporte'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}
