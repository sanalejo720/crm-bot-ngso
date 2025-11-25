// Update Quick Reply DTO - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { PartialType } from '@nestjs/swagger';
import { CreateQuickReplyDto } from './create-quick-reply.dto';

export class UpdateQuickReplyDto extends PartialType(CreateQuickReplyDto) {}
