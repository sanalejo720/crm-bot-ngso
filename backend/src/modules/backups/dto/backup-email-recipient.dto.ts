// Backup Email Recipients DTOs - NGS&O CRM Gestión
// DTOs para gestión de correos electrónicos de backup
// Desarrollado por: Alejandro Sandoval - AS Software

import { IsEmail, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBackupEmailRecipientDto {
  @ApiProperty({
    example: 'gerencia@empresa.com',
    description: 'Correo electrónico del destinatario',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @ApiProperty({
    example: 'Gerente General',
    description: 'Nombre del destinatario',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;
}

export class UpdateBackupEmailRecipientDto {
  @ApiProperty({
    example: 'gerencia@empresa.com',
    description: 'Correo electrónico del destinatario',
    required: false,
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'Gerente General',
    description: 'Nombre del destinatario',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: true,
    description: 'Si el destinatario está activo',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
