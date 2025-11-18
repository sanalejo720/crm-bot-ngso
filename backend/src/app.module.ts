import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Common modules
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// Business modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ChatsModule } from './modules/chats/chats.module';
import { MessagesModule } from './modules/messages/messages.module';
import { QueueModule } from './modules/queues/queue.module';
import { BotModule } from './modules/bot/bot.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { ClientsModule } from './modules/clients/clients.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production', // Solo en desarrollo
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),

    // Bull Queue with Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
    }),

    // Event Emitter
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),

    // Schedule (Cron jobs)
    ScheduleModule.forRoot(),

    // Business modules
    AuthModule,
    UsersModule,
    RolesModule,
    CampaignsModule,
    WhatsappModule,
    ChatsModule,
    MessagesModule,
    QueueModule,
    BotModule,
    GatewayModule,
    ClientsModule,
    TasksModule,
    ReportsModule,
    AuditModule,
  ],
  providers: [
    {
      provide: 'APP_FILTER',
      useClass: HttpExceptionFilter,
    },
    {
      provide: 'APP_INTERCEPTOR',
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
