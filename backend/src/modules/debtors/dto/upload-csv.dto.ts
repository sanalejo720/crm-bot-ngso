import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UploadCsvDto {
  @ApiProperty({ 
    type: 'string', 
    format: 'binary',
    description: 'Archivo CSV con columnas: fullName,documentType,documentNumber,phone,email,address,debtAmount,initialDebtAmount,daysOverdue,lastPaymentDate,promiseDate,status,notes,producto,numeroCredito,fechaVencimiento'
  })
  @IsNotEmpty()
  file: any;
}

export interface CsvDebtorRow {
  fullName: string;
  documentType: string;
  documentNumber: string;
  phone?: string;
  email?: string;
  address?: string;
  debtAmount: number;
  initialDebtAmount: number;
  daysOverdue: number;
  lastPaymentDate?: string;
  promiseDate?: string;
  status?: string;
  notes?: string;
  producto?: string;
  numeroCredito?: string;
  fechaVencimiento?: string;
}
