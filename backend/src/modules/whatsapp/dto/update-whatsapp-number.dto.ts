// Update WhatsApp Number DTO - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { PartialType } from '@nestjs/swagger';
import { CreateWhatsappNumberDto } from './create-whatsapp-number.dto';

export class UpdateWhatsappNumberDto extends PartialType(CreateWhatsappNumberDto) {}
