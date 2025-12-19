import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateMassCampaignDto } from './dto/create-mass-campaign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CampaignStatus } from './entities/campaign.entity';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

@ApiTags('campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva campaña' })
  @RequirePermissions({ module: 'campaigns', action: 'create' })
  create(@Body() createCampaignDto: CreateCampaignDto, @CurrentUser() user: any) {
    return this.campaignsService.create(createCampaignDto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las campañas' })
  @RequirePermissions({ module: 'campaigns', action: 'read' })
  findAll(
    @Query('status') status?: CampaignStatus,
    @Query('search') search?: string,
  ) {
    return this.campaignsService.findAll({ status, search });
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener campañas activas' })
  @RequirePermissions({ module: 'campaigns', action: 'read' })
  findActive() {
    return this.campaignsService.findActive();
  }

  @Get('my-campaigns')
  @ApiOperation({ summary: 'Obtener campañas asignadas al usuario actual (para agentes)' })
  async getMyCampaigns(@CurrentUser('id') userId: string) {
    return this.campaignsService.getUserCampaigns(userId);
  }

  // ====== ENDPOINTS PARA ENVÍO MASIVO (deben ir ANTES de :id) ======

  @Get('mass/stats')
  @ApiOperation({ summary: 'Obtener estadísticas de campañas masivas' })
  @RequirePermissions({ module: 'campaigns', action: 'read' })
  async getMassCampaignStats() {
    return this.campaignsService.getMassCampaignStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener campaña por ID' })
  @RequirePermissions({ module: 'campaigns', action: 'read' })
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Obtener estadísticas de campaña' })
  @RequirePermissions({ module: 'campaigns', action: 'read' })
  getStats(@Param('id') id: string) {
    return this.campaignsService.getStats(id);
  }

  @Get(':id/whatsapp-numbers')
  @ApiOperation({ summary: 'Obtener números WhatsApp de campaña' })
  @RequirePermissions({ module: 'campaigns', action: 'read' })
  getWhatsappNumbers(@Param('id') id: string) {
    return this.campaignsService.getWhatsappNumbers(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar campaña' })
  @RequirePermissions({ module: 'campaigns', action: 'update' })
  update(@Param('id') id: string, @Body() updateCampaignDto: UpdateCampaignDto) {
    return this.campaignsService.update(id, updateCampaignDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado de campaña' })
  @RequirePermissions({ module: 'campaigns', action: 'update' })
  updateStatus(@Param('id') id: string, @Body() body: { status: CampaignStatus }) {
    return this.campaignsService.updateStatus(id, body.status);
  }

  @Patch(':id/settings')
  @ApiOperation({ summary: 'Actualizar configuración de campaña' })
  @RequirePermissions({ module: 'campaigns', action: 'update' })
  updateSettings(@Param('id') id: string, @Body() body: { settings: Record<string, any> }) {
    return this.campaignsService.updateSettings(id, body.settings);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activar campaña' })
  @RequirePermissions({ module: 'campaigns', action: 'update' })
  activate(@Param('id') id: string) {
    return this.campaignsService.activate(id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pausar campaña' })
  @RequirePermissions({ module: 'campaigns', action: 'update' })
  pause(@Param('id') id: string) {
    return this.campaignsService.pause(id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicar campaña' })
  @RequirePermissions({ module: 'campaigns', action: 'create' })
  duplicate(
    @Param('id') id: string,
    @Body() body: { name: string },
    @CurrentUser() user: any,
  ) {
    return this.campaignsService.duplicate(id, body.name, user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar campaña (soft delete)' })
  @RequirePermissions({ module: 'campaigns', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }

  // ====== MÁS ENDPOINTS PARA ENVÍO MASIVO ======

  @Post('mass/send')
  @ApiOperation({ summary: 'Enviar campaña masiva de WhatsApp' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions({ module: 'campaigns', action: 'create' })
  async sendMassCampaign(
    @Body() createMassCampaignDto: CreateMassCampaignDto,
    @Request() req,
  ) {
    // Validar que sea admin o super admin
    const userRole = req.user?.role?.name;
    if (userRole !== 'Administrador' && userRole !== 'Super Admin') {
      throw new BadRequestException('Solo administradores pueden enviar campañas masivas');
    }
    return this.campaignsService.sendMassCampaign(createMassCampaignDto, req.user.userId);
  }

  @Post('mass/validate-csv')
  @ApiOperation({ summary: 'Validar archivo CSV para envío masivo' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions({ module: 'campaigns', action: 'create' })
  @UseInterceptors(FileInterceptor('file'))
  async validateCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se proporcionó archivo CSV');
    }

    try {
      const csvData = await this.parseCsv(file.buffer);
      const validation = await this.campaignsService.validateCsvData(csvData);

      return {
        valid: validation.valid,
        errors: validation.errors,
        recipientCount: validation.recipients.length,
        preview: validation.recipients.slice(0, 5), // Muestra los primeros 5
      };
    } catch (error) {
      throw new BadRequestException(`Error al procesar CSV: ${error.message}`);
    }
  }

  @Post('mass/upload-and-send')
  @ApiOperation({ summary: 'Subir CSV y enviar campaña masiva (proceso asíncrono)' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions({ module: 'campaigns', action: 'create' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAndSend(
    @UploadedFile() file: Express.Multer.File,
    @Body('campaignName') campaignName: string,
    @Body('templateSid') templateSid: string,
    @Body('description') description: string,
    @Body('messageDelay') messageDelay: string,
    @Body('batchSize') batchSize: string,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó archivo CSV');
    }

    if (!campaignName || !templateSid) {
      throw new BadRequestException('Nombre de campaña y template son requeridos');
    }

    try {
      const csvData = await this.parseCsv(file.buffer);
      const validation = await this.campaignsService.validateCsvData(csvData);

      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Iniciar envío en segundo plano (no esperar)
      const campaignData = {
        name: campaignName,
        templateSid,
        recipients: validation.recipients,
        description,
        messageDelay: messageDelay ? parseInt(messageDelay) : 1000,
        batchSize: batchSize ? parseInt(batchSize) : 10,
      };

      // No usar await - dejar que se ejecute en background
      this.campaignsService.sendMassCampaign(campaignData, req.user.userId)
        .then((result) => {
          console.log('✅ Campaña masiva completada:', result);
        })
        .catch((error) => {
          console.error('❌ Error en campaña masiva:', error);
        });

      // Devolver respuesta inmediata
      return {
        success: true,
        message: 'Campaña masiva iniciada en segundo plano',
        campaignName,
        templateSid,
        recipientCount: validation.recipients.length,
        estimatedDuration: Math.ceil((validation.recipients.length / (batchSize ? parseInt(batchSize) : 10)) * ((messageDelay ? parseInt(messageDelay) : 1000) / 1000)),
      };
    } catch (error) {
      throw new BadRequestException(`Error al procesar campaña: ${error.message}`);
    }
  }

  private parseCsv(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(buffer.toString());

      stream
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }
}
