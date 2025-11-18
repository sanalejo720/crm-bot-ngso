import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  Headers,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';

@Controller('webhooks/whatsapp')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly verifyToken: string;

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {
    this.verifyToken = this.configService.get('META_WEBHOOK_VERIFY_TOKEN', 'your_verify_token');
  }

  /**
   * Verificación de webhook de Meta (GET)
   */
  @Get('meta')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
  ) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }

    throw new BadRequestException('Webhook verification failed');
  }

  /**
   * Recibir eventos de webhook de Meta (POST)
   */
  @Post('meta')
  async receiveMetaWebhook(@Body() body: any, @Headers('x-hub-signature-256') signature: string) {
    this.logger.log('Received Meta webhook');

    try {
      // TODO: Validar firma del webhook si es necesario
      await this.whatsappService.processMetaWebhook(body);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing Meta webhook: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  /**
   * Webhook para WPPConnect (si se usa servidor externo)
   */
  @Post('wppconnect')
  async receiveWppConnectWebhook(@Body() body: any) {
    this.logger.log('Received WPPConnect webhook');

    try {
      // Procesar webhook de WPPConnect si es necesario
      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing WPPConnect webhook: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process webhook');
    }
  }
}
