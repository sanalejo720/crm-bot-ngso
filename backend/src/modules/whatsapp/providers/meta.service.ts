// Meta Service - Verificación de tokens - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';

  /**
   * Verificar que el token de acceso sea válido
   */
  async verifyToken(accessToken: string, phoneNumberId: string): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/${phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          fields: 'id,verified_name,display_phone_number',
        },
      });

      if (response.data && response.data.id) {
        this.logger.log(`Meta API verificada: ${response.data.verified_name || response.data.display_phone_number}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error al verificar token de Meta: ${error.message}`);
      if (error.response) {
        this.logger.error(`Respuesta de Meta: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }

  /**
   * Obtener información del número de WhatsApp
   */
  async getPhoneNumberInfo(accessToken: string, phoneNumberId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/${phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          fields: 'id,verified_name,display_phone_number,quality_rating,account_mode',
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Error al obtener info del número: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener Business Account info
   */
  async getBusinessAccountInfo(accessToken: string, businessAccountId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/${businessAccountId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          fields: 'id,name,timezone_id,message_template_namespace',
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Error al obtener Business Account: ${error.message}`);
      throw error;
    }
  }
}
