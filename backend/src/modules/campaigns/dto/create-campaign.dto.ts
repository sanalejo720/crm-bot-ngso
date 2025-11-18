import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignStatus } from '../entities/campaign.entity';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Campaña Ventas Q4 2024' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Campaña de ventas para el último trimestre' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: CampaignStatus.DRAFT, enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({
    example: {
      autoAssignment: true,
      assignmentStrategy: 'least-busy',
      maxChatsPerAgent: 5,
      botEnabled: true,
      botFlowId: '123e4567-e89b-12d3-a456-426614174000',
      businessHours: {
        enabled: true,
        timezone: 'America/Guayaquil',
        schedule: {
          monday: { start: '09:00', end: '18:00' },
          tuesday: { start: '09:00', end: '18:00' },
          wednesday: { start: '09:00', end: '18:00' },
          thursday: { start: '09:00', end: '18:00' },
          friday: { start: '09:00', end: '18:00' },
        },
      },
      autoCloseInactive: {
        enabled: true,
        inactivityMinutes: 30,
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
      },
    },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
