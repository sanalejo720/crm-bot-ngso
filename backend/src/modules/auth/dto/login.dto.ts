import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@crm.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '123456', description: 'Código 2FA' })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  user: {
    id: string;
    fullName: string;
    email: string;
    role: {
      id: string;
      name: string;
      permissions: Array<{ module: string; action: string }>;
    };
  };
}
