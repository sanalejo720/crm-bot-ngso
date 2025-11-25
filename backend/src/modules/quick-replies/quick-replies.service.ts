// Quick Replies Service - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuickReply } from './entities/quick-reply.entity';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';

@Injectable()
export class QuickRepliesService {
  constructor(
    @InjectRepository(QuickReply)
    private quickReplyRepository: Repository<QuickReply>,
  ) {}

  async create(userId: string, createDto: CreateQuickReplyDto): Promise<QuickReply> {
    // Validar que el shortcut no exista para el mismo usuario/campaña
    const existing = await this.quickReplyRepository.findOne({
      where: {
        shortcut: createDto.shortcut,
        userId,
        campaignId: createDto.campaignId || null,
      },
    });

    if (existing) {
      throw new BadRequestException('Ya existe una plantilla con ese shortcut');
    }

    const quickReply = this.quickReplyRepository.create({
      ...createDto,
      userId,
    });

    return await this.quickReplyRepository.save(quickReply);
  }

  async findAll(userId: string, campaignId?: string, category?: string): Promise<QuickReply[]> {
    const query = this.quickReplyRepository.createQueryBuilder('qr');

    // Plantillas globales (userId null) o del usuario
    query.where('(qr.userId IS NULL OR qr.userId = :userId)', { userId });

    // Filtrar por campaña si se especifica
    if (campaignId) {
      query.andWhere('(qr.campaignId IS NULL OR qr.campaignId = :campaignId)', { campaignId });
    }

    // Filtrar por categoría si se especifica
    if (category) {
      query.andWhere('qr.category = :category', { category });
    }

    // Solo plantillas activas
    query.andWhere('qr.isActive = true');

    // Ordenar por uso y fecha
    query.orderBy('qr.usageCount', 'DESC').addOrderBy('qr.createdAt', 'DESC');

    return await query.getMany();
  }

  async findOne(id: string): Promise<QuickReply> {
    const quickReply = await this.quickReplyRepository.findOne({ where: { id } });
    if (!quickReply) {
      throw new NotFoundException('Plantilla no encontrada');
    }
    return quickReply;
  }

  async update(id: string, userId: string, updateDto: UpdateQuickReplyDto): Promise<QuickReply> {
    const quickReply = await this.findOne(id);

    // Solo el creador puede editar (admin puede editar globales)
    if (quickReply.userId && quickReply.userId !== userId) {
      throw new BadRequestException('No tienes permiso para editar esta plantilla');
    }

    // Si cambia el shortcut, validar que no exista
    if (updateDto.shortcut && updateDto.shortcut !== quickReply.shortcut) {
      const existing = await this.quickReplyRepository.findOne({
        where: {
          shortcut: updateDto.shortcut,
          userId: quickReply.userId,
          campaignId: quickReply.campaignId,
        },
      });

      if (existing) {
        throw new BadRequestException('Ya existe una plantilla con ese shortcut');
      }
    }

    Object.assign(quickReply, updateDto);
    return await this.quickReplyRepository.save(quickReply);
  }

  async remove(id: string, userId: string): Promise<void> {
    const quickReply = await this.findOne(id);

    // Solo el creador puede eliminar (admin puede eliminar globales)
    if (quickReply.userId && quickReply.userId !== userId) {
      throw new BadRequestException('No tienes permiso para eliminar esta plantilla');
    }

    await this.quickReplyRepository.remove(quickReply);
  }

  /**
   * Reemplaza variables en el contenido de la plantilla
   * @param content Contenido con variables {{variable}}
   * @param variables Objeto con valores de variables
   */
  replaceVariables(content: string, variables: Record<string, any>): string {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    }

    return result;
  }

  /**
   * Aplica una plantilla y retorna el contenido con variables reemplazadas
   * @param id ID de la plantilla
   * @param variables Valores de variables
   */
  async applyTemplate(id: string, variables: Record<string, any>): Promise<string> {
    const quickReply = await this.findOne(id);

    // Incrementar contador de uso
    quickReply.usageCount += 1;
    await this.quickReplyRepository.save(quickReply);

    // Reemplazar variables
    return this.replaceVariables(quickReply.content, variables);
  }

  /**
   * Busca plantilla por shortcut
   * @param shortcut Shortcut (ej: /saludo)
   * @param userId ID del usuario
   * @param campaignId ID de la campaña (opcional)
   */
  async findByShortcut(
    shortcut: string, 
    userId: string, 
    campaignId?: string
  ): Promise<QuickReply | null> {
    const query = this.quickReplyRepository.createQueryBuilder('qr');

    query.where('qr.shortcut = :shortcut', { shortcut });
    query.andWhere('(qr.userId IS NULL OR qr.userId = :userId)', { userId });

    if (campaignId) {
      query.andWhere('(qr.campaignId IS NULL OR qr.campaignId = :campaignId)', { campaignId });
    }

    query.andWhere('qr.isActive = true');
    query.orderBy('qr.userId', 'DESC'); // Priorizar plantillas del usuario

    return await query.getOne();
  }

  /**
   * Obtiene estadísticas de uso de plantillas
   * @param userId ID del usuario
   */
  async getStats(userId: string): Promise<any> {
    const templates = await this.quickReplyRepository.find({
      where: { userId },
      order: { usageCount: 'DESC' },
    });

    const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0);
    const byCategory = templates.reduce((acc, t) => {
      const cat = t.category || 'Sin categoría';
      acc[cat] = (acc[cat] || 0) + t.usageCount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTemplates: templates.length,
      totalUsage,
      topTemplates: templates.slice(0, 5).map(t => ({
        id: t.id,
        title: t.title,
        shortcut: t.shortcut,
        usageCount: t.usageCount,
      })),
      byCategory,
    };
  }
}
