import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotFlow, BotFlowStatus } from './entities/bot-flow.entity';
import { BotNode } from './entities/bot-node.entity';
import {
  CreateBotFlowDto,
  UpdateBotFlowDto,
  CreateBotNodeDto,
  UpdateBotNodeDto,
} from './dto/bot-flow.dto';

@Injectable()
export class BotFlowsService {
  private readonly logger = new Logger(BotFlowsService.name);

  constructor(
    @InjectRepository(BotFlow)
    private botFlowRepository: Repository<BotFlow>,
    @InjectRepository(BotNode)
    private botNodeRepository: Repository<BotNode>,
  ) {}

  /**
   * Listar flujos con filtros
   */
  async findAll(
    status?: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: BotFlow[]; total: number }> {
    const query = this.botFlowRepository.createQueryBuilder('flow');

    if (status) {
      query.where('flow.status = :status', { status });
    }

    query
      .orderBy('flow.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  /**
   * Obtener flujo por ID con sus nodos
   */
  async findOneWithNodes(id: string): Promise<BotFlow> {
    const flow = await this.botFlowRepository.findOne({
      where: { id },
      relations: ['nodes'],
    });

    if (!flow) {
      throw new NotFoundException(`Flujo con ID ${id} no encontrado`);
    }

    return flow;
  }

  /**
   * Crear flujo
   */
  async create(createDto: CreateBotFlowDto): Promise<BotFlow> {
    const flow = this.botFlowRepository.create(createDto);
    return await this.botFlowRepository.save(flow);
  }

  /**
   * Actualizar flujo
   */
  async update(id: string, updateDto: UpdateBotFlowDto): Promise<BotFlow> {
    const flow = await this.botFlowRepository.findOne({ where: { id } });

    if (!flow) {
      throw new NotFoundException(`Flujo con ID ${id} no encontrado`);
    }

    Object.assign(flow, updateDto);
    return await this.botFlowRepository.save(flow);
  }

  /**
   * Eliminar flujo
   */
  async remove(id: string): Promise<void> {
    const flow = await this.botFlowRepository.findOne({ where: { id } });

    if (!flow) {
      throw new NotFoundException(`Flujo con ID ${id} no encontrado`);
    }

    await this.botFlowRepository.remove(flow);
    this.logger.log(`Flujo ${id} eliminado`);
  }

  /**
   * Duplicar flujo con todos sus nodos
   */
  async duplicate(id: string): Promise<BotFlow> {
    const originalFlow = await this.findOneWithNodes(id);

    // Crear copia del flujo
    const newFlow = this.botFlowRepository.create({
      name: `${originalFlow.name} (Copia)`,
      description: originalFlow.description,
      status: BotFlowStatus.DRAFT,
      variables: originalFlow.variables,
      settings: originalFlow.settings,
    });

    const savedFlow = await this.botFlowRepository.save(newFlow);

    // Duplicar nodos
    const nodeMapping = new Map<string, string>(); // oldId -> newId

    for (const originalNode of originalFlow.nodes) {
      const newNode = this.botNodeRepository.create({
        name: originalNode.name,
        type: originalNode.type,
        config: originalNode.config,
        positionX: originalNode.positionX + 50,
        positionY: originalNode.positionY + 50,
        flowId: savedFlow.id,
      });

      const savedNode = await this.botNodeRepository.save(newNode);
      nodeMapping.set(originalNode.id, savedNode.id);

      if (originalFlow.startNodeId === originalNode.id) {
        savedFlow.startNodeId = savedNode.id;
      }
    }

    // Actualizar referencias nextNodeId
    for (const originalNode of originalFlow.nodes) {
      const newNodeId = nodeMapping.get(originalNode.id);
      if (newNodeId && originalNode.nextNodeId) {
        const newNextNodeId = nodeMapping.get(originalNode.nextNodeId);
        if (newNextNodeId) {
          await this.botNodeRepository.update(newNodeId, {
            nextNodeId: newNextNodeId,
          });
        }
      }
    }

    await this.botFlowRepository.save(savedFlow);

    this.logger.log(`Flujo ${id} duplicado como ${savedFlow.id}`);
    return savedFlow;
  }

  /**
   * Publicar flujo (activar)
   */
  async publish(id: string): Promise<BotFlow> {
    const flow = await this.findOneWithNodes(id);

    if (!flow.startNodeId) {
      throw new BadRequestException('El flujo debe tener un nodo inicial antes de publicarse');
    }

    if (flow.nodes.length === 0) {
      throw new BadRequestException('El flujo debe tener al menos un nodo');
    }

    flow.status = BotFlowStatus.ACTIVE;
    return await this.botFlowRepository.save(flow);
  }

  // ==================== NODOS ====================

  /**
   * Crear nodo
   */
  async createNode(flowId: string, createDto: CreateBotNodeDto): Promise<BotNode> {
    const flow = await this.botFlowRepository.findOne({ where: { id: flowId } });

    if (!flow) {
      throw new NotFoundException(`Flujo con ID ${flowId} no encontrado`);
    }

    const node = this.botNodeRepository.create({
      name: createDto.name,
      type: createDto.type as any,
      config: createDto.config,
      nextNodeId: createDto.nextNodeId,
      positionX: createDto.positionX || 0,
      positionY: createDto.positionY || 0,
      flowId,
    });

    return await this.botNodeRepository.save(node);
  }

  /**
   * Crear múltiples nodos
   */
  async createNodesBulk(flowId: string, nodesDto: CreateBotNodeDto[]): Promise<BotNode[]> {
    const flow = await this.botFlowRepository.findOne({ where: { id: flowId } });

    if (!flow) {
      throw new NotFoundException(`Flujo con ID ${flowId} no encontrado`);
    }

    const createdNodes: BotNode[] = [];

    for (const dto of nodesDto) {
      const node = this.botNodeRepository.create({
        name: dto.name,
        type: dto.type as any,
        config: dto.config,
        nextNodeId: dto.nextNodeId,
        positionX: dto.positionX || 0,
        positionY: dto.positionY || 0,
        flowId,
      });
      const savedNode = await this.botNodeRepository.save(node);
      createdNodes.push(savedNode);
    }

    return createdNodes;
  }

  /**
   * Actualizar nodo
   */
  async updateNode(nodeId: string, updateDto: UpdateBotNodeDto): Promise<BotNode> {
    const node = await this.botNodeRepository.findOne({ where: { id: nodeId } });

    if (!node) {
      throw new NotFoundException(`Nodo con ID ${nodeId} no encontrado`);
    }

    Object.assign(node, updateDto);
    return await this.botNodeRepository.save(node);
  }

  /**
   * Eliminar nodo
   */
  async removeNode(nodeId: string): Promise<void> {
    const node = await this.botNodeRepository.findOne({ where: { id: nodeId } });

    if (!node) {
      throw new NotFoundException(`Nodo con ID ${nodeId} no encontrado`);
    }

    await this.botNodeRepository.remove(node);
    this.logger.log(`Nodo ${nodeId} eliminado`);
  }

  /**
   * Obtener estadísticas del flujo
   */
  async getStats(id: string): Promise<any> {
    const flow = await this.findOneWithNodes(id);

    return {
      totalNodes: flow.nodes.length,
      nodesByType: flow.nodes.reduce((acc, node) => {
        acc[node.type] = (acc[node.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      status: flow.status,
      hasStartNode: !!flow.startNodeId,
    };
  }
}
