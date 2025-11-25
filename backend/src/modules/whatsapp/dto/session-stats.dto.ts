// Session Statistics DTO - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

export interface SessionStatsDto {
  numberId: string;
  phoneNumber: string;
  displayName: string;
  status: string;
  isConnected: boolean;
  messagesSent: number;
  messagesReceived: number;
  totalMessages: number;
  lastMessageAt?: Date;
  connectedSince?: Date;
  uptime?: number; // en segundos
  alertCount?: number;
  offensiveWordsDetected?: number;
}

export interface ActiveSessionsDto {
  totalSessions: number;
  activeSessions: number;
  maxSessions: number;
  sessions: SessionStatsDto[];
  uptimeAverage: number;
}
