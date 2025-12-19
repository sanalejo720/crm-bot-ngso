import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class RecipientDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  variables?: Record<string, string>;

  @IsOptional()
  @IsString()
  agentEmail?: string;
}

export class CreateMassCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  templateSid: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients: RecipientDto[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(100)
  messageDelay?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  batchSize?: number;
}
