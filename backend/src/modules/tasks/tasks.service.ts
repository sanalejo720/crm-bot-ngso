import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Crear nueva tarea
   */
  async create(createTaskDto: CreateTaskDto, createdBy: string): Promise<Task> {
    this.logger.log(`Creando tarea: ${createTaskDto.title}`);

    const task = this.taskRepository.create(createTaskDto as any);
    (task as any).createdBy = { id: createdBy };

    const saved = await this.taskRepository.save(task);
    const savedTask = Array.isArray(saved) ? saved[0] : saved;

    // Emitir evento
    this.eventEmitter.emit('task.created', savedTask);

    // Notificar al asignado si existe
    if (savedTask.assignedTo) {
      this.eventEmitter.emit('task.assigned', {
        task: savedTask,
        assignedTo: (savedTask.assignedTo as any)?.id || savedTask.assignedTo,
      });
    }

    return savedTask;
  }

  /**
   * Obtener todas las tareas con filtros
   */
  async findAll(filters?: {
    assignedTo?: string;
    createdBy?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    clientId?: string;
    campaignId?: string;
    chatId?: string;
  }): Promise<Task[]> {
    const query = this.taskRepository.createQueryBuilder('task');

    if (filters?.assignedTo) {
      query.andWhere('task.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    if (filters?.createdBy) {
      query.andWhere('task.createdBy = :createdBy', { createdBy: filters.createdBy });
    }

    if (filters?.status) {
      query.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      query.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    if (filters?.clientId) {
      query.andWhere('task.clientId = :clientId', { clientId: filters.clientId });
    }

    if (filters?.campaignId) {
      query.andWhere('task.campaignId = :campaignId', { campaignId: filters.campaignId });
    }

    if (filters?.chatId) {
      query.andWhere('task.chatId = :chatId', { chatId: filters.chatId });
    }

    query
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.dueDate', 'ASC')
      .addOrderBy('task.createdAt', 'DESC');

    return query.getMany();
  }

  /**
   * Obtener tareas pendientes del usuario
   */
  async findPendingByUser(userId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: {
        assignedTo: { id: userId } as any,
        status: TaskStatus.PENDING,
      },
      order: {
        priority: 'DESC',
        dueDate: 'ASC',
      },
    });
  }

  /**
   * Obtener tareas vencidas del usuario
   */
  async findOverdueByUser(userId: string): Promise<Task[]> {
    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignedTo', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('task.status = :status', { status: TaskStatus.PENDING })
      .andWhere('task.dueDate < :now', { now: new Date() })
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.dueDate', 'ASC')
      .getMany();
  }

  /**
   * Obtener tarea por ID
   */
  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['client', 'campaign', 'chat'],
    });

    if (!task) {
      throw new NotFoundException(`Tarea ${id} no encontrada`);
    }

    return task;
  }

  /**
   * Actualizar tarea
   */
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);

    Object.assign(task, updateTaskDto);

    const updatedTask = await this.taskRepository.save(task);

    this.eventEmitter.emit('task.updated', updatedTask);

    return updatedTask;
  }

  /**
   * Cambiar estado de tarea
   */
  async updateStatus(id: string, status: TaskStatus, completedBy?: string): Promise<Task> {
    const task = await this.findOne(id);

    const oldStatus = task.status;
    task.status = status;

    if (status === TaskStatus.COMPLETED) {
      task.completedAt = new Date();
      task.completedBy = completedBy;
    }

    const updatedTask = await this.taskRepository.save(task);

    this.eventEmitter.emit('task.status-changed', {
      task: updatedTask,
      oldStatus,
      newStatus: status,
    });

    return updatedTask;
  }

  /**
   * Asignar tarea a usuario
   */
  async assignTo(id: string, userId: string): Promise<Task> {
    const task = await this.findOne(id);

    const oldAssignee = task.assignedTo;
    task.assignedTo = { id: userId } as any;

    const updatedTask = await this.taskRepository.save(task);

    this.eventEmitter.emit('task.reassigned', {
      task: updatedTask,
      oldAssignee,
      newAssignee: userId,
    });

    return updatedTask;
  }

  /**
   * Marcar como completada
   */
  async complete(id: string, completedBy: string): Promise<Task> {
    return this.updateStatus(id, TaskStatus.COMPLETED, completedBy);
  }

  /**
   * Eliminar tarea (soft delete)
   */
  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);
    await this.taskRepository.softRemove(task);

    this.eventEmitter.emit('task.deleted', { taskId: id });

    this.logger.log(`Tarea ${id} eliminada`);
  }

  /**
   * Obtener estadísticas de tareas
   */
  async getStats(userId?: string) {
    const query = this.taskRepository.createQueryBuilder('task');

    if (userId) {
      query.where('task.assignedTo = :userId', { userId });
    }

    const total = await query.getCount();

    const pending = await query
      .clone()
      .andWhere('task.status = :status', { status: TaskStatus.PENDING })
      .getCount();

    const completed = await query
      .clone()
      .andWhere('task.status = :status', { status: TaskStatus.COMPLETED })
      .getCount();

    const overdue = await query
      .clone()
      .andWhere('task.status = :status', { status: TaskStatus.PENDING })
      .andWhere('task.dueDate < :now', { now: new Date() })
      .getCount();

    const byPriority = await query
      .clone()
      .select('task.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.priority')
      .getRawMany();

    return {
      total,
      pending,
      completed,
      overdue,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0,
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }

  /**
   * Cron: Notificar tareas vencidas
   */
  @Cron(CronExpression.EVERY_HOUR)
  async notifyOverdueTasks() {
    this.logger.log('Verificando tareas vencidas...');

    const overdueTasks = await this.taskRepository.find({
      where: {
        status: TaskStatus.PENDING,
        dueDate: LessThan(new Date()),
      },
    });

    for (const task of overdueTasks) {
      this.eventEmitter.emit('task.overdue', task);
    }

    this.logger.log(`${overdueTasks.length} tareas vencidas notificadas`);
  }

  /**
   * Cron: Recordatorios de tareas próximas (24 horas)
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async notifyUpcomingTasks() {
    this.logger.log('Verificando tareas próximas...');

    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    const upcomingTasks = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.status = :status', { status: TaskStatus.PENDING })
      .andWhere('task.dueDate > :now', { now: new Date() })
      .andWhere('task.dueDate <= :tomorrow', { tomorrow })
      .getMany();

    for (const task of upcomingTasks) {
      this.eventEmitter.emit('task.reminder', task);
    }

    this.logger.log(`${upcomingTasks.length} recordatorios de tareas enviados`);
  }
}
