import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReturnToBotDto {
  @ApiProperty({
    description: 'Motivo del retorno al bot',
    example: 'cliente_no_responde',
    enum: [
      'cliente_no_responde',
      'solicitud_completada',
      'informacion_enviada',
      'derivado_otro_canal',
      'fuera_horario',
      'otro',
    ],
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Notas adicionales del agente',
    required: false,
    example: 'Cliente no respondió después de 3 mensajes',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
