import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QueueService, ChatAssignmentJob } from './queue.service';

@Processor('chat-assignment')
export class QueueProcessor {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(private queueService: QueueService) {}

  @Process('assign-chat')
  async handleAssignChat(job: Job<ChatAssignmentJob>) {
    this.logger.log(`Procesando job ${job.id}: assign-chat`);

    try {
      await this.queueService.processAssignment(job.data);
      this.logger.log(`Job ${job.id} completado exitosamente`);
    } catch (error) {
      this.logger.error(`Error en job ${job.id}: ${error.message}`, error.stack);
      throw error; // Bull lo reintentará automáticamente
    }
  }
}
