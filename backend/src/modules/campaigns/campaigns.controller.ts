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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CampaignStatus } from './entities/campaign.entity';

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
}
