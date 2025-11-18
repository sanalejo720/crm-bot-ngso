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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TaskStatus, TaskPriority } from './entities/task.entity';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva tarea' })
  @RequirePermissions({ module: 'tasks', action: 'create' })
  create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() user: any) {
    return this.tasksService.create(createTaskDto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las tareas con filtros' })
  @RequirePermissions({ module: 'tasks', action: 'read' })
  findAll(
    @Query('assignedTo') assignedTo?: string,
    @Query('createdBy') createdBy?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('clientId') clientId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('chatId') chatId?: string,
  ) {
    return this.tasksService.findAll({
      assignedTo,
      createdBy,
      status,
      priority,
      clientId,
      campaignId,
      chatId,
    });
  }

  @Get('my-tasks')
  @ApiOperation({ summary: 'Obtener mis tareas pendientes' })
  @RequirePermissions({ module: 'tasks', action: 'read' })
  getMyTasks(@CurrentUser() user: any) {
    return this.tasksService.findPendingByUser(user.sub);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Obtener tareas vencidas' })
  @RequirePermissions({ module: 'tasks', action: 'read' })
  getOverdue(@CurrentUser() user: any) {
    return this.tasksService.findOverdueByUser(user.sub);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de tareas' })
  @RequirePermissions({ module: 'tasks', action: 'read' })
  getStats(@Query('userId') userId?: string) {
    return this.tasksService.getStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener tarea por ID' })
  @RequirePermissions({ module: 'tasks', action: 'read' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar tarea' })
  @RequirePermissions({ module: 'tasks', action: 'update' })
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado de tarea' })
  @RequirePermissions({ module: 'tasks', action: 'update' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: TaskStatus },
    @CurrentUser() user: any,
  ) {
    return this.tasksService.updateStatus(id, body.status, user.sub);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Marcar tarea como completada' })
  @RequirePermissions({ module: 'tasks', action: 'update' })
  complete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.complete(id, user.sub);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Asignar tarea a usuario' })
  @RequirePermissions({ module: 'tasks', action: 'update' })
  assignTo(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.tasksService.assignTo(id, body.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar tarea (soft delete)' })
  @RequirePermissions({ module: 'tasks', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
