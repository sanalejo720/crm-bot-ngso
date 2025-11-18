# 📁 ESTRUCTURA DE CARPETAS DEL PROYECTO

## 🎯 Estructura General del Proyecto

```
crm-whatsapp-project/
├── backend/                    # NestJS Backend
├── frontend/                   # React Frontend
├── docker/                     # Configuración Docker
├── docs/                       # Documentación adicional
├── scripts/                    # Scripts de utilidad
├── .gitignore
├── docker-compose.yml
├── README.md
└── package.json               # Scripts raíz (opcional)
```

---

## 🔧 BACKEND (NestJS + TypeScript)

```
backend/
├── src/
│   ├── main.ts                           # Punto de entrada de la aplicación
│   ├── app.module.ts                     # Módulo raíz
│   ├── app.controller.ts
│   ├── app.service.ts
│   │
│   ├── config/                           # Configuraciones
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── redis.config.ts
│   │   ├── whatsapp.config.ts
│   │   └── index.ts
│   │
│   ├── common/                           # Código compartido
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts
│   │   │   ├── permissions.decorator.ts
│   │   │   ├── current-user.decorator.ts
│   │   │   └── public.decorator.ts
│   │   │
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   ├── permissions.guard.ts
│   │   │   └── rate-limit.guard.ts
│   │   │
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts
│   │   │   ├── timeout.interceptor.ts
│   │   │   └── audit.interceptor.ts
│   │   │
│   │   ├── pipes/
│   │   │   ├── validation.pipe.ts
│   │   │   └── parse-id.pipe.ts
│   │   │
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts
│   │   │   ├── all-exceptions.filter.ts
│   │   │   └── query-failed.filter.ts
│   │   │
│   │   ├── middlewares/
│   │   │   ├── logger.middleware.ts
│   │   │   └── cors.middleware.ts
│   │   │
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts
│   │   │   └── base-response.dto.ts
│   │   │
│   │   ├── interfaces/
│   │   │   ├── pagination.interface.ts
│   │   │   ├── user-payload.interface.ts
│   │   │   └── request-with-user.interface.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── pagination.util.ts
│   │   │   ├── hash.util.ts
│   │   │   ├── date.util.ts
│   │   │   └── file.util.ts
│   │   │
│   │   └── constants/
│   │       ├── roles.constant.ts
│   │       ├── permissions.constant.ts
│   │       └── messages.constant.ts
│   │
│   ├── database/                         # Configuración de base de datos
│   │   ├── database.module.ts
│   │   ├── migrations/
│   │   │   ├── 1699000000000-CreateUsersTable.ts
│   │   │   ├── 1699000001000-CreateRolesTable.ts
│   │   │   ├── 1699000002000-CreateCampaignsTable.ts
│   │   │   └── ...
│   │   │
│   │   └── seeds/
│   │       ├── 1-roles.seed.ts
│   │       ├── 2-permissions.seed.ts
│   │       ├── 3-admin-user.seed.ts
│   │       └── index.ts
│   │
│   ├── modules/                          # Módulos de negocio
│   │   │
│   │   ├── auth/                         # Módulo de Autenticación
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── local.strategy.ts
│   │   │   │   └── refresh-token.strategy.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   ├── register.dto.ts
│   │   │   │   ├── change-password.dto.ts
│   │   │   │   └── refresh-token.dto.ts
│   │   │   └── services/
│   │   │       ├── two-factor.service.ts
│   │   │       └── token.service.ts
│   │   │
│   │   ├── users/                        # Módulo de Usuarios
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   └── user-session.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   ├── update-user.dto.ts
│   │   │   │   ├── update-agent-status.dto.ts
│   │   │   │   └── query-users.dto.ts
│   │   │   ├── repositories/
│   │   │   │   └── users.repository.ts
│   │   │   └── interfaces/
│   │   │       └── user.interface.ts
│   │   │
│   │   ├── roles/                        # Módulo de Roles y Permisos
│   │   │   ├── roles.module.ts
│   │   │   ├── roles.controller.ts
│   │   │   ├── roles.service.ts
│   │   │   ├── permissions.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── role.entity.ts
│   │   │   │   ├── permission.entity.ts
│   │   │   │   ├── role-permission.entity.ts
│   │   │   │   └── user-permission.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-role.dto.ts
│   │   │       ├── update-role.dto.ts
│   │   │       └── assign-permissions.dto.ts
│   │   │
│   │   ├── campaigns/                    # Módulo de Campañas
│   │   │   ├── campaigns.module.ts
│   │   │   ├── campaigns.controller.ts
│   │   │   ├── campaigns.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── campaign.entity.ts
│   │   │   │   ├── campaign-number.entity.ts
│   │   │   │   └── campaign-agent.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-campaign.dto.ts
│   │   │       ├── update-campaign.dto.ts
│   │   │       ├── assign-numbers.dto.ts
│   │   │       └── assign-agents.dto.ts
│   │   │
│   │   ├── whatsapp/                     # Módulo de Integración WhatsApp
│   │   │   ├── whatsapp.module.ts
│   │   │   ├── whatsapp.controller.ts
│   │   │   ├── whatsapp.service.ts
│   │   │   ├── webhook.controller.ts
│   │   │   ├── entities/
│   │   │   │   └── whatsapp-number.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-whatsapp-number.dto.ts
│   │   │   │   └── update-whatsapp-number.dto.ts
│   │   │   ├── providers/
│   │   │   │   ├── meta-cloud.service.ts
│   │   │   │   └── wppconnect.service.ts
│   │   │   └── interfaces/
│   │   │       ├── whatsapp-provider.interface.ts
│   │   │       ├── webhook-payload.interface.ts
│   │   │       └── message-payload.interface.ts
│   │   │
│   │   ├── queues/                       # Módulo de Colas
│   │   │   ├── queues.module.ts
│   │   │   ├── queues.controller.ts
│   │   │   ├── queues.service.ts
│   │   │   ├── entities/
│   │   │   │   └── queue.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-queue.dto.ts
│   │   │       └── update-queue.dto.ts
│   │   │
│   │   ├── routing/                      # Módulo de Enrutamiento
│   │   │   ├── routing.module.ts
│   │   │   ├── routing.service.ts
│   │   │   ├── entities/
│   │   │   │   └── routing-rule.entity.ts
│   │   │   ├── dto/
│   │   │   │   └── create-routing-rule.dto.ts
│   │   │   └── strategies/
│   │   │       ├── round-robin.strategy.ts
│   │   │       ├── least-busy.strategy.ts
│   │   │       ├── skills-based.strategy.ts
│   │   │       └── routing-strategy.interface.ts
│   │   │
│   │   ├── chats/                        # Módulo de Chats
│   │   │   ├── chats.module.ts
│   │   │   ├── chats.controller.ts
│   │   │   ├── chats.service.ts
│   │   │   ├── chats.gateway.ts          # WebSocket
│   │   │   ├── entities/
│   │   │   │   ├── chat.entity.ts
│   │   │   │   ├── chat-tag.entity.ts
│   │   │   │   ├── chat-note.entity.ts
│   │   │   │   └── chat-metric.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-chat.dto.ts
│   │   │   │   ├── update-chat.dto.ts
│   │   │   │   ├── assign-chat.dto.ts
│   │   │   │   ├── transfer-chat.dto.ts
│   │   │   │   ├── close-chat.dto.ts
│   │   │   │   └── query-chats.dto.ts
│   │   │   └── repositories/
│   │   │       └── chats.repository.ts
│   │   │
│   │   ├── messages/                     # Módulo de Mensajes
│   │   │   ├── messages.module.ts
│   │   │   ├── messages.controller.ts
│   │   │   ├── messages.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── message.entity.ts
│   │   │   │   └── message-queue.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── send-message.dto.ts
│   │   │   │   └── query-messages.dto.ts
│   │   │   └── processors/
│   │   │       └── message-queue.processor.ts
│   │   │
│   │   ├── bot/                          # Módulo de Bot
│   │   │   ├── bot.module.ts
│   │   │   ├── bot.controller.ts
│   │   │   ├── bot-engine.service.ts
│   │   │   ├── bot-flows.controller.ts
│   │   │   ├── bot-flows.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── bot-flow.entity.ts
│   │   │   │   ├── bot-node.entity.ts
│   │   │   │   └── bot-session.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-bot-flow.dto.ts
│   │   │   │   ├── update-bot-flow.dto.ts
│   │   │   │   └── create-bot-node.dto.ts
│   │   │   └── nodes/
│   │   │       ├── message-node.handler.ts
│   │   │       ├── menu-node.handler.ts
│   │   │       ├── input-node.handler.ts
│   │   │       ├── condition-node.handler.ts
│   │   │       └── node-handler.interface.ts
│   │   │
│   │   ├── clients/                      # Módulo de Clientes
│   │   │   ├── clients.module.ts
│   │   │   ├── clients.controller.ts
│   │   │   ├── clients.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── client.entity.ts
│   │   │   │   └── client-tag.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-client.dto.ts
│   │   │   │   ├── update-client.dto.ts
│   │   │   │   ├── query-clients.dto.ts
│   │   │   │   └── import-clients.dto.ts
│   │   │   └── repositories/
│   │   │       └── clients.repository.ts
│   │   │
│   │   ├── tasks/                        # Módulo de Tareas
│   │   │   ├── tasks.module.ts
│   │   │   ├── tasks.controller.ts
│   │   │   ├── tasks.service.ts
│   │   │   ├── tasks-scheduler.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── task.entity.ts
│   │   │   │   └── task-comment.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-task.dto.ts
│   │   │       ├── update-task.dto.ts
│   │   │       └── complete-task.dto.ts
│   │   │
│   │   ├── reports/                      # Módulo de Reportes
│   │   │   ├── reports.module.ts
│   │   │   ├── reports.controller.ts
│   │   │   ├── reports.service.ts
│   │   │   ├── report-builder.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── campaign-report.dto.ts
│   │   │   │   ├── agent-report.dto.ts
│   │   │   │   └── export-report.dto.ts
│   │   │   └── generators/
│   │   │       ├── pdf-generator.service.ts
│   │   │       ├── excel-generator.service.ts
│   │   │       └── csv-generator.service.ts
│   │   │
│   │   ├── analytics/                    # Módulo de Analytics
│   │   │   ├── analytics.module.ts
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── analytics.gateway.ts      # WebSocket
│   │   │   ├── entities/
│   │   │   │   ├── agent-state.entity.ts
│   │   │   │   └── agent-metric.entity.ts
│   │   │   └── dto/
│   │   │       └── live-dashboard.dto.ts
│   │   │
│   │   ├── audit/                        # Módulo de Auditoría
│   │   │   ├── audit.module.ts
│   │   │   ├── audit.controller.ts
│   │   │   ├── audit.service.ts
│   │   │   ├── entities/
│   │   │   │   └── audit-log.entity.ts
│   │   │   └── dto/
│   │   │       └── query-audit-logs.dto.ts
│   │   │
│   │   ├── backup/                       # Módulo de Backup
│   │   │   ├── backup.module.ts
│   │   │   ├── backup.controller.ts
│   │   │   ├── backup.service.ts
│   │   │   ├── backup-scheduler.service.ts
│   │   │   ├── entities/
│   │   │   │   └── backup.entity.ts
│   │   │   └── dto/
│   │   │       └── create-backup.dto.ts
│   │   │
│   │   ├── files/                        # Módulo de Archivos
│   │   │   ├── files.module.ts
│   │   │   ├── files.controller.ts
│   │   │   ├── files.service.ts
│   │   │   ├── entities/
│   │   │   │   └── file.entity.ts
│   │   │   └── storage/
│   │   │       ├── local-storage.service.ts
│   │   │       └── s3-storage.service.ts
│   │   │
│   │   ├── quick-replies/                # Módulo de Respuestas Rápidas
│   │   │   ├── quick-replies.module.ts
│   │   │   ├── quick-replies.controller.ts
│   │   │   ├── quick-replies.service.ts
│   │   │   ├── entities/
│   │   │   │   └── quick-reply.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-quick-reply.dto.ts
│   │   │       └── update-quick-reply.dto.ts
│   │   │
│   │   ├── templates/                    # Módulo de Plantillas
│   │   │   ├── templates.module.ts
│   │   │   ├── templates.controller.ts
│   │   │   ├── templates.service.ts
│   │   │   ├── entities/
│   │   │   │   └── template.entity.ts
│   │   │   └── dto/
│   │   │       └── create-template.dto.ts
│   │   │
│   │   └── notifications/                # Módulo de Notificaciones
│   │       ├── notifications.module.ts
│   │       ├── notifications.service.ts
│   │       └── providers/
│   │           ├── email.provider.ts
│   │           └── push.provider.ts
│   │
│   └── shared/                           # Servicios compartidos
│       ├── redis/
│       │   ├── redis.module.ts
│       │   └── redis.service.ts
│       │
│       ├── bull/
│       │   ├── bull.module.ts
│       │   └── queue.service.ts
│       │
│       ├── cache/
│       │   ├── cache.module.ts
│       │   └── cache.service.ts
│       │
│       ├── logger/
│       │   ├── logger.module.ts
│       │   └── logger.service.ts
│       │
│       └── events/
│           ├── events.module.ts
│           └── events.service.ts
│
├── test/                                 # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── uploads/                              # Archivos subidos (desarrollo)
├── logs/                                 # Logs de aplicación
│
├── .env                                  # Variables de entorno
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── package.json
└── README.md
```

---

## ⚛️ FRONTEND (React + TypeScript)

```
frontend/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   ├── manifest.json
│   └── assets/
│       ├── images/
│       └── fonts/
│
├── src/
│   ├── index.tsx                         # Punto de entrada
│   ├── App.tsx                           # Componente raíz
│   ├── routes.tsx                        # Configuración de rutas
│   │
│   ├── api/                              # Cliente API
│   │   ├── axios.config.ts
│   │   ├── endpoints.ts
│   │   ├── auth.api.ts
│   │   ├── users.api.ts
│   │   ├── campaigns.api.ts
│   │   ├── chats.api.ts
│   │   ├── messages.api.ts
│   │   ├── clients.api.ts
│   │   ├── reports.api.ts
│   │   └── analytics.api.ts
│   │
│   ├── assets/                           # Assets estáticos
│   │   ├── images/
│   │   ├── icons/
│   │   ├── fonts/
│   │   └── styles/
│   │       └── global.css
│   │
│   ├── components/                       # Componentes reutilizables
│   │   ├── common/
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.styles.ts
│   │   │   │   └── Button.test.tsx
│   │   │   ├── Input/
│   │   │   ├── Select/
│   │   │   ├── Modal/
│   │   │   ├── Dropdown/
│   │   │   ├── Card/
│   │   │   ├── Table/
│   │   │   ├── Tabs/
│   │   │   ├── Badge/
│   │   │   ├── Avatar/
│   │   │   ├── Spinner/
│   │   │   ├── Toast/
│   │   │   ├── Pagination/
│   │   │   └── DatePicker/
│   │   │
│   │   ├── layout/
│   │   │   ├── Sidebar/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Sidebar.styles.ts
│   │   │   ├── Header/
│   │   │   ├── Footer/
│   │   │   └── MainLayout/
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatList/
│   │   │   │   ├── ChatList.tsx
│   │   │   │   ├── ChatListItem.tsx
│   │   │   │   └── ChatList.styles.ts
│   │   │   ├── ChatWindow/
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   │   └── ChatWindow.styles.ts
│   │   │   ├── ChatInfo/
│   │   │   │   ├── ChatInfo.tsx
│   │   │   │   ├── ClientDetails.tsx
│   │   │   │   └── ChatNotes.tsx
│   │   │   └── QuickReplies/
│   │   │
│   │   ├── dashboard/
│   │   │   ├── MetricCard/
│   │   │   ├── LiveAgentsWidget/
│   │   │   ├── ActiveChatsWidget/
│   │   │   ├── QueueStatusWidget/
│   │   │   └── PerformanceChart/
│   │   │
│   │   ├── users/
│   │   │   ├── UserList/
│   │   │   ├── UserForm/
│   │   │   ├── UserCard/
│   │   │   └── AgentStatusIndicator/
│   │   │
│   │   ├── campaigns/
│   │   │   ├── CampaignList/
│   │   │   ├── CampaignForm/
│   │   │   └── CampaignCard/
│   │   │
│   │   ├── clients/
│   │   │   ├── ClientList/
│   │   │   ├── ClientForm/
│   │   │   ├── ClientCard/
│   │   │   └── ClientHistory/
│   │   │
│   │   ├── reports/
│   │   │   ├── ReportFilters/
│   │   │   ├── ReportTable/
│   │   │   ├── ReportCharts/
│   │   │   └── ExportButton/
│   │   │
│   │   └── bot/
│   │       ├── FlowBuilder/
│   │       ├── NodeEditor/
│   │       └── FlowCanvas/
│   │
│   ├── pages/                            # Páginas/Vistas
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   └── TwoFactorPage.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx         # Dashboard general
│   │   │   ├── SupervisorDashboard.tsx
│   │   │   └── AgentDashboard.tsx
│   │   │
│   │   ├── chats/
│   │   │   ├── ChatsPage.tsx             # Vista principal de chats
│   │   │   └── ChatDetailPage.tsx
│   │   │
│   │   ├── users/
│   │   │   ├── UsersPage.tsx
│   │   │   ├── UserDetailPage.tsx
│   │   │   └── ProfilePage.tsx
│   │   │
│   │   ├── campaigns/
│   │   │   ├── CampaignsPage.tsx
│   │   │   └── CampaignDetailPage.tsx
│   │   │
│   │   ├── clients/
│   │   │   ├── ClientsPage.tsx
│   │   │   └── ClientDetailPage.tsx
│   │   │
│   │   ├── tasks/
│   │   │   └── TasksPage.tsx
│   │   │
│   │   ├── reports/
│   │   │   ├── ReportsPage.tsx
│   │   │   ├── CampaignReportPage.tsx
│   │   │   └── AgentReportPage.tsx
│   │   │
│   │   ├── analytics/
│   │   │   └── LiveAnalyticsPage.tsx
│   │   │
│   │   ├── whatsapp/
│   │   │   ├── WhatsappNumbersPage.tsx
│   │   │   └── WhatsappSetupPage.tsx
│   │   │
│   │   ├── bot/
│   │   │   ├── BotFlowsPage.tsx
│   │   │   └── BotBuilderPage.tsx
│   │   │
│   │   ├── audit/
│   │   │   └── AuditLogsPage.tsx
│   │   │
│   │   ├── settings/
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── RolesPage.tsx
│   │   │   └── BackupPage.tsx
│   │   │
│   │   └── NotFoundPage.tsx
│   │
│   ├── store/                            # Redux Store
│   │   ├── index.ts
│   │   ├── rootReducer.ts
│   │   │
│   │   ├── slices/
│   │   │   ├── auth.slice.ts
│   │   │   ├── user.slice.ts
│   │   │   ├── chats.slice.ts
│   │   │   ├── messages.slice.ts
│   │   │   ├── campaigns.slice.ts
│   │   │   ├── clients.slice.ts
│   │   │   ├── analytics.slice.ts
│   │   │   └── ui.slice.ts
│   │   │
│   │   └── services/                     # RTK Query
│   │       ├── auth.service.ts
│   │       ├── users.service.ts
│   │       ├── chats.service.ts
│   │       └── campaigns.service.ts
│   │
│   ├── hooks/                            # Custom Hooks
│   │   ├── useAuth.ts
│   │   ├── useWebSocket.ts
│   │   ├── useDebounce.ts
│   │   ├── usePagination.ts
│   │   ├── usePermissions.ts
│   │   └── useNotifications.ts
│   │
│   ├── contexts/                         # React Contexts
│   │   ├── AuthContext.tsx
│   │   ├── WebSocketContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── utils/                            # Utilidades
│   │   ├── date.utils.ts
│   │   ├── format.utils.ts
│   │   ├── validation.utils.ts
│   │   ├── storage.utils.ts
│   │   └── constants.ts
│   │
│   ├── types/                            # TypeScript Types
│   │   ├── user.types.ts
│   │   ├── chat.types.ts
│   │   ├── message.types.ts
│   │   ├── campaign.types.ts
│   │   ├── client.types.ts
│   │   └── api.types.ts
│   │
│   ├── guards/                           # Route Guards
│   │   ├── AuthGuard.tsx
│   │   ├── RoleGuard.tsx
│   │   └── PermissionGuard.tsx
│   │
│   └── theme/                            # Tema y estilos
│       ├── theme.ts
│       ├── colors.ts
│       └── typography.ts
│
├── .env                                  # Variables de entorno
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── tsconfig.json
├── package.json
├── vite.config.ts                        # Vite config (o webpack)
└── README.md
```

---

## 🐳 DOCKER

```
docker/
├── backend/
│   ├── Dockerfile
│   └── .dockerignore
│
├── frontend/
│   ├── Dockerfile
│   └── .dockerignore
│
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
│
└── postgres/
    └── init.sql
```

---

## 📜 SCRIPTS

```
scripts/
├── setup.sh                              # Setup inicial del proyecto
├── seed-database.sh                      # Poblar BD con datos iniciales
├── backup-database.sh                    # Backup manual de BD
├── restore-database.sh                   # Restaurar BD
├── deploy.sh                             # Script de despliegue
└── generate-migration.sh                 # Generar nueva migración
```

---

## 📚 DOCS

```
docs/
├── api/
│   └── swagger.json                      # Documentación API (generada)
│
├── architecture/
│   ├── diagrams/
│   └── decisions.md
│
├── deployment/
│   ├── vps-setup.md
│   └── production-checklist.md
│
└── user-guides/
    ├── supervisor-guide.md
    └── agent-guide.md
```

---

## 🔧 ARCHIVOS DE CONFIGURACIÓN RAÍZ

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: crm-postgres
    environment:
      POSTGRES_DB: crm_whatsapp
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    container_name: crm-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: ./backend
      dockerfile: ../docker/backend/Dockerfile
    container_name: crm-backend
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/frontend/Dockerfile
    container_name: crm-frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules

  nginx:
    build:
      context: ./docker/nginx
    container_name: crm-nginx
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - frontend
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf

volumes:
  postgres_data:
  redis_data:
```

---

## 📦 PACKAGE.JSON RAÍZ (Opcional)

```json
{
  "name": "crm-whatsapp-project",
  "version": "1.0.0",
  "description": "CRM para WhatsApp con Bot y múltiples agentes",
  "scripts": {
    "install:all": "cd backend && npm install && cd ../frontend && npm install",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run start:dev",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "cd backend && npm run build",
    "build:frontend": "cd frontend && npm run build",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:build": "docker-compose build",
    "migrate": "cd backend && npm run migration:run",
    "seed": "cd backend && npm run seed",
    "backup": "sh scripts/backup-database.sh",
    "lint": "npm run lint:backend && npm run lint:frontend",
    "lint:backend": "cd backend && npm run lint",
    "lint:frontend": "cd frontend && npm run lint",
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd backend && npm run test",
    "test:frontend": "cd frontend && npm run test"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

---

## 🌳 ARCHIVO .GITIGNORE RAÍZ

```gitignore
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Environment variables
.env
.env.local
.env.production

# Logs
logs/
*.log
npm-debug.log*

# Build outputs
dist/
build/
.next/
out/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Uploads
uploads/
temp/

# Database
*.sqlite
*.db

# Docker
.dockerignore

# Testing
coverage/

# Backups
backups/
*.sql
*.dump
```

---

## 📝 RESUMEN DE CONVENCIONES

### Nomenclatura de Archivos:
- **Componentes React**: PascalCase (`ChatWindow.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useAuth.ts`)
- **Servicios NestJS**: kebab-case con sufijo `.service.ts` (`auth.service.ts`)
- **Controladores NestJS**: kebab-case con sufijo `.controller.ts` (`users.controller.ts`)
- **Entidades**: kebab-case con sufijo `.entity.ts` (`user.entity.ts`)
- **DTOs**: kebab-case con sufijo `.dto.ts` (`create-user.dto.ts`)

### Organización:
- **Módulos NestJS**: Una carpeta por módulo con toda su lógica
- **Componentes React**: Carpeta por componente con archivo principal, estilos y tests
- **Separación clara**: Backend y Frontend completamente separados
- **Shared code**: En carpetas `common/` o `shared/`

### Mejores Prácticas:
- ✅ Módulos pequeños y cohesivos
- ✅ Separación de responsabilidades (controller → service → repository)
- ✅ DTOs para validación de entrada
- ✅ Entities para mapeo de BD
- ✅ Interfaces para contratos
- ✅ Guards para autorización
- ✅ Interceptors para transformación
- ✅ Pipes para validación

---

## 🎯 PRÓXIMOS PASOS

✅ **Estructura de carpetas completa definida**

Ahora procederé con:

**5. ✅ Implementación de código base** (integraciones WhatsApp, módulos principales)

¿Continúo con la implementación del código o prefieres revisar algo antes?
