import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BotEngineService } from './bot-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('bot')
@Controller('bot')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BotController {
  constructor(private readonly botEngineService: BotEngineService) {}

  @Post('start/:chatId/:flowId')
  @ApiOperation({ summary: 'Iniciar flujo de bot para un chat' })
  @RequirePermissions({ module: 'bot', action: 'create' })
  async startFlow(
    @Param('chatId') chatId: string,
    @Param('flowId') flowId: string,
  ) {
    await this.botEngineService.startFlow(chatId, flowId);
    return { success: true, message: 'Flujo iniciado' };
  }

  @Post('process/:chatId')
  @ApiOperation({ summary: 'Procesar input del usuario en el bot' })
  @RequirePermissions({ module: 'bot', action: 'create' })
  async processInput(
    @Param('chatId') chatId: string,
    @Body() body: { userInput: string },
  ) {
    await this.botEngineService.processUserInput(chatId, body.userInput);
    return { success: true, message: 'Input procesado' };
  }
}
