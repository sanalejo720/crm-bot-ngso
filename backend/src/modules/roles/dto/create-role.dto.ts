import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'Agente' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Rol para atención de chats' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}
