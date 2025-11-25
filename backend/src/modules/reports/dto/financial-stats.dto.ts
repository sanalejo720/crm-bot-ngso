// Financial Stats DTOs - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

export class CampaignFinancialsDto {
  campaignId: string;
  campaignName: string;
  totalToRecover: number;
  totalRecovered: number;
  totalInPromises: number;
  recoveryPercentage: number;
  paymentsCount: number;
  promisesCount: number;
  clientsWithDebt: number;
  clientsPaid: number;
  trend?: 'up' | 'down' | 'stable';
}

export class AgentRecaudoDto {
  agentId: string;
  agentName: string;
  totalRecovered: number;
  paymentsCount: number;
  promisesCount: number;
  totalInPromises: number;
  effectivenessRate: number;
  averageTicket: number;
  clientsAttended: number;
  ranking?: number;
}

export class FinancialSummaryDto {
  period: string;
  totalToRecover: number;
  totalRecovered: number;
  totalInPromises: number;
  globalRecoveryRate: number;
  campaignsStats: CampaignFinancialsDto[];
  topAgents: AgentRecaudoDto[];
}

export class DailyFinancialsDto {
  date: string;
  totalRecovered: number;
  paymentsCount: number;
  promisesCount: number;
}

export class FinancialTrendDto {
  dates: string[];
  recovered: number[];
  promises: number[];
}
