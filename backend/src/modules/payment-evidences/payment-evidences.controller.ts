import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PaymentEvidencesService } from './payment-evidences.service';
import { CreateEvidenceDto, ReviewEvidenceDto, QueryEvidencesDto } from './dto/evidence.dto';
import { PaymentEvidence } from './entities/payment-evidence.entity';

@ApiTags('Payment Evidences')
@Controller('payment-evidences')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PaymentEvidencesController {
  constructor(private readonly evidencesService: PaymentEvidencesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Subir evidencia de pago' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        clientId: { type: 'string' },
        paymentAmount: { type: 'number' },
        paymentDate: { type: 'string', format: 'date' },
        notes: { type: 'string' },
        campaignId: { type: 'string' },
        referenceNumber: { type: 'string' },
      },
      required: ['file', 'clientId', 'paymentAmount', 'paymentDate'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermissions({ module: 'payment_evidences', action: 'create' })
  async uploadEvidence(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDto: CreateEvidenceDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const evidence = await this.evidencesService.uploadEvidence(file, createDto, req.user.id);

    return {
      success: true,
      data: evidence,
      message: 'Evidencia de pago subida exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar evidencias de pago' })
  @RequirePermissions({ module: 'payment_evidences', action: 'read' })
  async findAll(@Query() query: QueryEvidencesDto, @Request() req) {
    // Si el usuario es agente (no supervisor ni admin), solo ver sus propias evidencias
    const userRole = req.user.role?.name;
    const isSupervisorOrAdmin = ['Supervisor', 'Super Admin', 'Administrador'].includes(userRole);
    
    if (!isSupervisorOrAdmin && !query.uploadedBy) {
      query.uploadedBy = req.user.id; // Forzar filtro por el agente actual
    }

    const evidences = await this.evidencesService.findAll(query);

    return {
      success: true,
      data: evidences,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('pending/count')
  @ApiOperation({ summary: 'Obtener cantidad de evidencias pendientes' })
  @RequirePermissions({ module: 'payment_evidences', action: 'read' })
  async getPendingCount() {
    const count = await this.evidencesService.getPendingCount();

    return {
      success: true,
      data: { count },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Obtener evidencias de un cliente' })
  @RequirePermissions({ module: 'payment_evidences', action: 'read' })
  async getClientEvidences(@Param('clientId') clientId: string) {
    const evidences = await this.evidencesService.getEvidencesByClient(clientId);

    return {
      success: true,
      data: evidences,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una evidencia por ID' })
  @RequirePermissions({ module: 'payment_evidences', action: 'read' })
  async findOne(@Param('id') id: string) {
    const evidence = await this.evidencesService.findOne(id);

    return {
      success: true,
      data: evidence,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Revisar evidencia (aprobar/rechazar)' })
  @RequirePermissions({ module: 'payment_evidences', action: 'review' })
  async reviewEvidence(
    @Param('id') id: string,
    @Body() reviewDto: ReviewEvidenceDto,
    @Request() req,
  ) {
    const evidence = await this.evidencesService.reviewEvidence(id, reviewDto, req.user.id);

    return {
      success: true,
      data: evidence,
      message: `Evidencia ${reviewDto.status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente`,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar evidencia de pago' })
  @RequirePermissions({ module: 'payment_evidences', action: 'delete' })
  async deleteEvidence(@Param('id') id: string) {
    await this.evidencesService.deleteEvidence(id);

    return {
      success: true,
      message: 'Evidencia eliminada exitosamente',
      timestamp: new Date().toISOString(),
    };
  }
}
