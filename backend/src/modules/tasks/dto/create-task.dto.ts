import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ example: 'Llamar al cliente' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Verificar interés en producto X' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: TaskStatus.PENDING, enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ example: TaskPriority.HIGH, enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  chatId?: string;
}
