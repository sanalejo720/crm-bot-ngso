import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debtor, DocumentType } from './entities/debtor.entity';
import { CreateDebtorDto } from './dto/create-debtor.dto';
import { CsvDebtorRow } from './dto/upload-csv.dto';
import { UploadResultDto, UploadErrorDto, DebtorRowDto } from './dto/upload-result.dto';
import csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';

@Injectable()
export class DebtorsService {
  private readonly logger = new Logger(DebtorsService.name);

  constructor(
    @InjectRepository(Debtor)
    private debtorRepository: Repository<Debtor>,
  ) {}

  /**
   * Crear deudor manualmente
   */
  async create(createDebtorDto: CreateDebtorDto): Promise<Debtor> {
    // Verificar si ya existe
    const existing = await this.debtorRepository.findOne({
      where: {
        documentType: createDebtorDto.documentType,
        documentNumber: createDebtorDto.documentNumber,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Ya existe un deudor con ${createDebtorDto.documentType} ${createDebtorDto.documentNumber}`,
      );
    }

    const debtor = this.debtorRepository.create(createDebtorDto);
    return await this.debtorRepository.save(debtor);
  }

  /**
   * Buscar deudor por tipo y número de documento
   */
  async findByDocument(documentType: DocumentType, documentNumber: string): Promise<Debtor | null> {
    return await this.debtorRepository.findOne({
      where: { documentType, documentNumber },
      relations: ['campaign'],
    });
  }

  /**
   * Buscar deudor solo por número de documento (sin importar el tipo)
   */
  async findByDocumentNumber(documentNumber: string): Promise<Debtor | null> {
    return await this.debtorRepository.findOne({
      where: { documentNumber },
      relations: ['campaign'],
    });
  }

  /**
   * Normalizar teléfono eliminando prefijos y sufijos de WhatsApp
   */
  private normalizePhone(phone: string): string {
    if (!phone) return '';
    // Eliminar @c.us, @g.us y cualquier sufijo de WhatsApp
    let normalized = phone.replace(/@c\.us|@g\.us|@s\.whatsapp\.net/g, '');
    // Eliminar espacios, guiones y paréntesis
    normalized = normalized.replace(/[\s\-\(\)]/g, '');
    return normalized;
  }

  /**
   * Buscar deudor por teléfono (normalizado)
   */
  async findByPhone(phone: string): Promise<Debtor | null> {
    const normalizedPhone = this.normalizePhone(phone);
    
    this.logger.debug(`Buscando deudor por teléfono: ${phone} -> normalizado: ${normalizedPhone}`);
    
    // Buscar por el teléfono normalizado
    const debtor = await this.debtorRepository
      .createQueryBuilder('debtor')
      .where('REPLACE(REPLACE(debtor.phone, \' \', \'\'), \'-\', \'\') = :phone', { 
        phone: normalizedPhone 
      })
      .getOne();
    
    if (debtor) {
      this.logger.log(`✅ Deudor encontrado: ${debtor.fullName} (${debtor.documentNumber})`);
    } else {
      this.logger.debug(`❌ No se encontró deudor con teléfono: ${normalizedPhone}`);
    }
    
    return debtor;
  }

  /**
   * Listar todos los deudores con paginación
   */
  async findAll(page = 1, limit = 50): Promise<{ data: Debtor[]; total: number }> {
    const [data, total] = await this.debtorRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  /**
   * Actualizar deudor
   */
  async update(id: string, updateData: Partial<CreateDebtorDto>): Promise<Debtor> {
    const debtor = await this.debtorRepository.findOne({ where: { id } });

    if (!debtor) {
      throw new NotFoundException(`Deudor con ID ${id} no encontrado`);
    }

    Object.assign(debtor, updateData);
    return await this.debtorRepository.save(debtor);
  }

  /**
   * Actualizar fecha de último contacto
   */
  async updateLastContacted(id: string): Promise<void> {
    await this.debtorRepository.update(id, {
      lastContactedAt: new Date(),
    });
  }

  /**
   * Procesar archivo (CSV o Excel) y cargar deudores
   */
  async uploadFromFile(fileBuffer: Buffer, filename: string): Promise<UploadResultDto> {
    const errors: UploadErrorDto[] = [];
    let rows: DebtorRowDto[] = [];

    try {
      // Detectar tipo de archivo y parsear
      if (filename.endsWith('.csv')) {
        rows = await this.parseCSV(fileBuffer);
      } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
        rows = await this.parseExcel(fileBuffer);
      } else {
        throw new BadRequestException('Formato de archivo no soportado. Use CSV o Excel (.xlsx, .xls)');
      }

      this.logger.log(`📄 Archivo parseado: ${rows.length} registros encontrados`);
    } catch (error) {
      throw new BadRequestException(`Error al parsear archivo: ${error.message}`);
    }

    // Estadísticas
    let created = 0;
    let updated = 0;
    let duplicated = 0;
    let failed = 0;
    let totalDebt = 0;
    let totalDaysOverdue = 0;
    const byDocumentType: Record<string, number> = {};

    // Procesar cada fila
    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2; // +2 porque la fila 1 es el header

      try {
        // Validar campos requeridos
        const validation = this.validateDebtorRow(row, rowNumber);
        if (!validation.valid) {
          errors.push({
            row: rowNumber,
            documentNumber: row.documentNumber,
            fullName: row.fullName,
            error: validation.error,
          });
          failed++;
          continue;
        }

        // Normalizar tipo de documento
        const docType = this.normalizeDocumentType(row.documentType);
        if (!docType) {
          errors.push({
            row: rowNumber,
            documentNumber: row.documentNumber,
            fullName: row.fullName,
            error: `Tipo de documento inválido: ${row.documentType}. Valores permitidos: CC, CE, NIT, TI, PASSPORT`,
          });
          failed++;
          continue;
        }

        // Buscar si ya existe
        const existing = await this.debtorRepository.findOne({
          where: {
            documentType: docType,
            documentNumber: row.documentNumber.trim(),
          },
        });

        const debtAmount = Number(row.debtAmount) || 0;
        const daysOverdue = Number(row.daysOverdue) || 0;

        const debtorData: Partial<Debtor> = {
          fullName: row.fullName.trim(),
          documentType: docType,
          documentNumber: row.documentNumber.trim(),
          phone: row.phone?.trim() || null,
          email: row.email?.trim() || null,
          address: row.address?.trim() || null,
          debtAmount,
          initialDebtAmount: Number(row.initialDebtAmount) || debtAmount,
          daysOverdue,
          lastPaymentDate: this.parseDate(row.lastPaymentDate),
          promiseDate: this.parseDate(row.promiseDate),
          status: row.status?.trim() || 'active',
          notes: row.notes?.trim() || null,
          metadata: {
            producto: row.producto?.trim(),
            numeroCredito: row.numeroCredito?.trim(),
            fechaVencimiento: row.fechaVencimiento?.trim(),
            compania: row.compania?.trim(),
            campaignId: row.campaignId?.trim(),
          },
        };

        if (existing) {
          // Actualizar existente
          Object.assign(existing, debtorData);
          await this.debtorRepository.save(existing);
          updated++;
          this.logger.debug(`Actualizado: ${existing.documentNumber} - ${existing.fullName}`);
        } else {
          // Crear nuevo
          const debtor = this.debtorRepository.create(debtorData);
          await this.debtorRepository.save(debtor);
          created++;
          this.logger.debug(`Creado: ${debtor.documentNumber} - ${debtor.fullName}`);
        }

        // Estadísticas
        totalDebt += debtAmount;
        totalDaysOverdue += daysOverdue;
        byDocumentType[docType] = (byDocumentType[docType] || 0) + 1;

      } catch (error) {
        errors.push({
          row: rowNumber,
          documentNumber: row.documentNumber,
          fullName: row.fullName,
          error: error.message,
          details: error.stack,
        });
        failed++;
        this.logger.error(`Error procesando fila ${rowNumber}:`, error);
      }
    }

    const totalProcessed = created + updated;
    const averageDaysOverdue = totalProcessed > 0 ? Math.round(totalDaysOverdue / totalProcessed) : 0;

    this.logger.log(`✅ Archivo procesado: ${created} creados, ${updated} actualizados, ${duplicated} duplicados, ${failed} fallidos`);

    return {
      success: failed === 0,
      totalRows: rows.length,
      created,
      updated,
      duplicated,
      failed,
      errors: errors.slice(0, 100), // Limitar a 100 errores para no saturar la respuesta
      summary: {
        totalDebt,
        averageDaysOverdue,
        byDocumentType,
      },
    };
  }

  /**
   * Parsear CSV
   */
  private async parseCSV(fileBuffer: Buffer): Promise<DebtorRowDto[]> {
    const results: DebtorRowDto[] = [];

    await new Promise<void>((resolve, reject) => {
      const stream = Readable.from(fileBuffer.toString('utf-8'));
      stream
        .pipe(csvParser({ separator: ',' }))
        .on('data', (data: any) => {
          // Filtrar filas vacías
          const hasData = Object.values(data).some(val => val && val.toString().trim() !== '');
          if (hasData) {
            results.push(this.normalizeRowKeys(data));
          }
        })
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });

    return results;
  }

  /**
   * Parsear Excel
   */
  private async parseExcel(fileBuffer: Buffer): Promise<DebtorRowDto[]> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    return rawData.map(row => this.normalizeRowKeys(row));
  }

  /**
   * Normalizar keys de las filas (manejar variaciones de nombres)
   */
  private normalizeRowKeys(row: any): DebtorRowDto {
    const getField = (variants: string[]): any => {
      for (const key of Object.keys(row)) {
        if (variants.some(v => key.toLowerCase().includes(v.toLowerCase()))) {
          return row[key];
        }
      }
      return undefined;
    };

    return {
      fullName: getField(['nombre', 'fullname', 'name', 'cliente']),
      documentType: getField(['tipo_doc', 'tipodoc', 'documenttype', 'tipo_documento']),
      documentNumber: getField(['documento', 'document', 'documentnumber', 'numero_documento', 'cedula']),
      phone: getField(['telefono', 'phone', 'celular', 'tel']),
      email: getField(['correo', 'email', 'mail']),
      address: getField(['direccion', 'address', 'domicilio']),
      debtAmount: getField(['deuda', 'debt', 'debtamount', 'saldo', 'valor']),
      initialDebtAmount: getField(['deuda_inicial', 'initialdebt', 'capital']),
      daysOverdue: getField(['mora', 'daysoverdue', 'dias_mora', 'diasmora']),
      lastPaymentDate: getField(['ultimo_pago', 'lastpayment', 'fecha_pago']),
      promiseDate: getField(['promesa', 'promise', 'fecha_promesa', 'compromiso']),
      status: getField(['estado', 'status']),
      notes: getField(['notas', 'notes', 'observaciones']),
      producto: getField(['producto', 'product']),
      numeroCredito: getField(['credito', 'credit', 'numero_credito', 'cuenta']),
      fechaVencimiento: getField(['vencimiento', 'due', 'fecha_vencimiento']),
      compania: getField(['compania', 'company', 'empresa']),
      campaignId: getField(['campana', 'campaign', 'campaignid']),
    };
  }

  /**
   * Validar fila de deudor
   */
  private validateDebtorRow(row: DebtorRowDto, rowNumber: number): { valid: boolean; error?: string } {
    if (!row.fullName || row.fullName.toString().trim() === '') {
      return { valid: false, error: 'Campo "nombre" es requerido' };
    }

    if (!row.documentType || row.documentType.toString().trim() === '') {
      return { valid: false, error: 'Campo "tipo_doc" es requerido' };
    }

    if (!row.documentNumber || row.documentNumber.toString().trim() === '') {
      return { valid: false, error: 'Campo "documento" es requerido' };
    }

    if (row.debtAmount && isNaN(Number(row.debtAmount))) {
      return { valid: false, error: 'Campo "deuda" debe ser un número válido' };
    }

    return { valid: true };
  }

  /**
   * Normalizar tipo de documento
   */
  private normalizeDocumentType(docType: string): DocumentType | null {
    if (!docType) return null;

    const normalized = docType.toString().trim().toUpperCase();
    const mapping: Record<string, DocumentType> = {
      'CC': DocumentType.CC,
      'CEDULA': DocumentType.CC,
      'C.C': DocumentType.CC,
      'CE': DocumentType.CE,
      'C.E': DocumentType.CE,
      'EXTRANJERIA': DocumentType.CE,
      'NIT': DocumentType.NIT,
      'TI': DocumentType.TI,
      'T.I': DocumentType.TI,
      'TARJETA': DocumentType.TI,
      'PASSPORT': DocumentType.PASSPORT,
      'PASAPORTE': DocumentType.PASSPORT,
    };

    return mapping[normalized] || null;
  }

  /**
   * Parsear fecha en diferentes formatos
   */
  private parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;

    try {
      // Intentar parsear diferentes formatos
      const str = dateStr.toString().trim();
      
      // Formato ISO (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return new Date(str);
      }
      
      // Formato DD/MM/YYYY
      if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
        const [day, month, year] = str.split('/');
        return new Date(`${year}-${month}-${day}`);
      }

      // Formato Excel (número de serie)
      if (!isNaN(Number(str))) {
        const excelDate = Number(str);
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return date;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Procesar CSV (método legacy para compatibilidad)
   */
  async uploadFromCsv(fileBuffer: Buffer): Promise<{ created: number; updated: number; errors: string[] }> {
    const result = await this.uploadFromFile(fileBuffer, 'file.csv');
    return {
      created: result.created,
      updated: result.updated,
      errors: result.errors.map(e => `Fila ${e.row}: ${e.error}`),
    };
  }

  /**
   * Eliminar deudor (soft delete)
   */
  async remove(id: string): Promise<void> {
    const debtor = await this.debtorRepository.findOne({ where: { id } });

    if (!debtor) {
      throw new NotFoundException(`Deudor con ID ${id} no encontrado`);
    }

    await this.debtorRepository.remove(debtor);
  }
}
