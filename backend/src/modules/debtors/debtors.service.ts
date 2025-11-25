import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debtor, DocumentType } from './entities/debtor.entity';
import { CreateDebtorDto } from './dto/create-debtor.dto';
import { CsvDebtorRow } from './dto/upload-csv.dto';
import csvParser from 'csv-parser';
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
    });
  }

  /**
   * Buscar deudor por teléfono
   */
  async findByPhone(phone: string): Promise<Debtor | null> {
    return await this.debtorRepository.findOne({
      where: { phone },
    });
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
   * Procesar CSV y cargar deudores
   */
  async uploadFromCsv(fileBuffer: Buffer): Promise<{ created: number; updated: number; errors: string[] }> {
    const results: CsvDebtorRow[] = [];
    const errors: string[] = [];

    // Parsear CSV
    await new Promise<void>((resolve, reject) => {
      const stream = Readable.from(fileBuffer.toString());
      stream
        .pipe(csvParser())
        .on('data', (data: CsvDebtorRow) => results.push(data))
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });

    this.logger.log(`📄 CSV parseado: ${results.length} registros encontrados`);

    let created = 0;
    let updated = 0;

    // Procesar cada fila
    for (const [index, row] of results.entries()) {
      try {
        // Validar campos requeridos
        if (!row.fullName || !row.documentType || !row.documentNumber) {
          errors.push(`Fila ${index + 2}: Faltan campos requeridos (fullName, documentType, documentNumber)`);
          continue;
        }

        // Validar tipo de documento
        if (!Object.values(DocumentType).includes(row.documentType as DocumentType)) {
          errors.push(`Fila ${index + 2}: Tipo de documento inválido: ${row.documentType}`);
          continue;
        }

        // Buscar si ya existe
        const existing = await this.debtorRepository.findOne({
          where: {
            documentType: row.documentType as DocumentType,
            documentNumber: row.documentNumber,
          },
        });

        const debtorData: Partial<Debtor> = {
          fullName: row.fullName,
          documentType: row.documentType as DocumentType,
          documentNumber: row.documentNumber,
          phone: row.phone || null,
          email: row.email || null,
          address: row.address || null,
          debtAmount: Number(row.debtAmount) || 0,
          initialDebtAmount: Number(row.initialDebtAmount) || 0,
          daysOverdue: Number(row.daysOverdue) || 0,
          lastPaymentDate: row.lastPaymentDate ? new Date(row.lastPaymentDate) : null,
          promiseDate: row.promiseDate ? new Date(row.promiseDate) : null,
          status: row.status || 'active',
          notes: row.notes || null,
          metadata: {
            producto: row.producto,
            numeroCredito: row.numeroCredito,
            fechaVencimiento: row.fechaVencimiento,
          },
        };

        if (existing) {
          // Actualizar existente
          Object.assign(existing, debtorData);
          await this.debtorRepository.save(existing);
          updated++;
        } else {
          // Crear nuevo
          const debtor = this.debtorRepository.create(debtorData);
          await this.debtorRepository.save(debtor);
          created++;
        }
      } catch (error) {
        errors.push(`Fila ${index + 2}: ${error.message}`);
        this.logger.error(`Error procesando fila ${index + 2}:`, error);
      }
    }

    this.logger.log(`✅ CSV procesado: ${created} creados, ${updated} actualizados, ${errors.length} errores`);

    return { created, updated, errors };
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
