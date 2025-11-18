// Types para NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: Role;
  isAgent: boolean;
  agentState?: AgentState;
  currentChatsCount?: number;
  maxConcurrentChats?: number;
  isActive: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

export type AgentState = 'available' | 'busy' | 'offline' | 'in-break';

export interface Client {
  id: string;
  fullName: string; // Backend usa fullName
  name?: string; // Alias para compatibilidad
  email?: string;
  phone: string;
  documentType?: string;
  documentNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  tags?: string[];
  
  // Campos de cobranza
  debtAmount: number;
  originalDebtAmount?: number;
  daysOverdue: number;
  dueDate?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  promisePaymentDate?: string;
  promisePaymentAmount?: number;
  collectionStatus: CollectionStatus;
  priority?: Priority;
  
  createdAt: string;
  updatedAt: string;
}

export type CollectionStatus = 
  | 'pending' 
  | 'contacted' 
  | 'promise' 
  | 'paid' 
  | 'legal' 
  | 'unlocatable';

export type Priority = 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  settings: CampaignSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignSettings {
  autoAssignment: boolean;
  assignmentStrategy: 'round-robin' | 'least-busy' | 'skills-based';
  maxConcurrentChats: number;
  businessHours?: {
    start: string;
    end: string;
  };
}

export interface Chat {
  id: string;
  externalId: string;
  platform: 'whatsapp' | 'meta';
  status: ChatStatus;
  priority: number;
  campaign: Campaign;
  client: Client;
  assignedAgent?: User;
  lastMessage?: Message;
  unreadCount: number;
  startedAt: string;
  closedAt?: string;
  metadata?: Record<string, any>;
}

export type ChatStatus = 'waiting' | 'active' | 'resolved' | 'closed';

export type MessageType = 
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'location'
  | 'contact'
  | 'sticker'
  | 'template';

export interface Message {
  id: string;
  chatId: string;
  type: MessageType;
  direction: 'inbound' | 'outbound';
  senderType: 'client' | 'agent' | 'bot' | 'system';
  status: MessageStatus;
  content: string;
  mediaUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  dueDate?: string;
  assignedTo?: User;
  client?: Client;
  chat?: Chat;
  createdBy: User;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemReport {
  totalChats: number;
  activeChats: number;
  resolvedChats: number;
  averageResponseTime: number; // TMR en segundos
  averageHandlingTime: number; // TMO en segundos
  messagesTotal: number;
  period: {
    start: string;
    end: string;
  };
}

export interface AgentReport {
  agent: User;
  activeChats: number;
  totalChatsHandled: number;
  totalMessages: number;
  averageResponseTime: number;
  averageHandlingTime: number;
  solutionsPerHour: number; // SPH
  onlineTime: number; // minutos
}

export interface CollectionReport {
  totalDebt: number;
  totalDebtors: number;
  byPriority: {
    urgente: { count: number; amount: number };
    alta: { count: number; amount: number };
    media: { count: number; amount: number };
    baja: { count: number; amount: number };
  };
  byStatus: {
    pending: { count: number; amount: number };
    contacted: { count: number; amount: number };
    promise: { count: number; amount: number };
    paid: { count: number; amount: number };
    legal: { count: number; amount: number };
    unlocatable: { count: number; amount: number };
  };
  promisesTotal: number;
  promisesAmount: number;
  collectionRate: number; // porcentaje
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  requires2FA: boolean;
}

export interface TwoFactorRequest {
  token: string;
}

// WebSocket events
export interface SocketEvent<T = any> {
  event: string;
  data: T;
}

export interface ChatAssignedEvent {
  chatId: string;
  agentId: string;
  timestamp: string;
}

export interface MessageReceivedEvent {
  chatId: string;
  message: Message;
}

export interface AgentStatusChangedEvent {
  userId: string;
  userName?: string;
  state: AgentState;
  timestamp: string;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
