import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PauseType } from '../entities/agent-pause.entity';

export class ClockInDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ClockOutDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class StartPauseDto {
  @ApiProperty({ enum: PauseType })
  @IsEnum(PauseType)
  pauseType: PauseType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class EndPauseDto {
  @ApiProperty()
  @IsUUID()
  pauseId: string;
}

export class GetWorkdayStatsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  agentId?: string;
}
