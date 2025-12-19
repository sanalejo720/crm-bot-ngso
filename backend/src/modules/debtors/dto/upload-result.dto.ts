export class UploadResultDto {
  success: boolean;
  totalRows: number;
  created: number;
  updated: number;
  duplicated: number;
  failed: number;
  errors: UploadErrorDto[];
  summary: {
    totalDebt: number;
    averageDaysOverdue: number;
    byDocumentType: Record<string, number>;
  };
}

export class UploadErrorDto {
  row: number;
  documentNumber?: string;
  fullName?: string;
  error: string;
  details?: any;
}

export class DebtorRowDto {
  fullName: string;
  documentType: string;
  documentNumber: string;
  phone?: string;
  email?: string;
  address?: string;
  debtAmount?: number;
  initialDebtAmount?: number;
  daysOverdue?: number;
  lastPaymentDate?: string;
  promiseDate?: string;
  status?: string;
  notes?: string;
  // Campos adicionales para metadata
  producto?: string;
  numeroCredito?: string;
  fechaVencimiento?: string;
  compania?: string;
  campaignId?: string;
  // Nombre del asesor asignado (se busca en BD)
  assignedAgentName?: string;
}
