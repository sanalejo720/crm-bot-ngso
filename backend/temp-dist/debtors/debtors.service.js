"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var DebtorsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebtorsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const debtor_entity_1 = require("./entities/debtor.entity");
const csv_parser_1 = __importDefault(require("csv-parser"));
const XLSX = __importStar(require("xlsx"));
const stream_1 = require("stream");
let DebtorsService = DebtorsService_1 = class DebtorsService {
    constructor(debtorRepository) {
        this.debtorRepository = debtorRepository;
        this.logger = new common_1.Logger(DebtorsService_1.name);
    }
    /**
     * Crear deudor manualmente
     */
    async create(createDebtorDto) {
        // Verificar si ya existe
        const existing = await this.debtorRepository.findOne({
            where: {
                documentType: createDebtorDto.documentType,
                documentNumber: createDebtorDto.documentNumber,
            },
        });
        if (existing) {
            throw new common_1.BadRequestException(`Ya existe un deudor con ${createDebtorDto.documentType} ${createDebtorDto.documentNumber}`);
        }
        const debtor = this.debtorRepository.create(createDebtorDto);
        return await this.debtorRepository.save(debtor);
    }
    /**
     * Buscar deudor por tipo y número de documento
     */
    async findByDocument(documentType, documentNumber) {
        return await this.debtorRepository.findOne({
            where: { documentType, documentNumber },
        });
    }
    /**
     * Normalizar teléfono eliminando prefijos y sufijos de WhatsApp
     */
    normalizePhone(phone) {
        if (!phone)
            return '';
        // Eliminar @c.us, @g.us y cualquier sufijo de WhatsApp
        let normalized = phone.replace(/@c\.us|@g\.us|@s\.whatsapp\.net/g, '');
        // Eliminar espacios, guiones y paréntesis
        normalized = normalized.replace(/[\s\-\(\)]/g, '');
        return normalized;
    }
    /**
     * Buscar deudor por teléfono (normalizado)
     */
    async findByPhone(phone) {
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
        }
        else {
            this.logger.debug(`❌ No se encontró deudor con teléfono: ${normalizedPhone}`);
        }
        return debtor;
    }
    /**
     * Listar todos los deudores con paginación
     */
    async findAll(page = 1, limit = 50) {
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
    async update(id, updateData) {
        const debtor = await this.debtorRepository.findOne({ where: { id } });
        if (!debtor) {
            throw new common_1.NotFoundException(`Deudor con ID ${id} no encontrado`);
        }
        Object.assign(debtor, updateData);
        return await this.debtorRepository.save(debtor);
    }
    /**
     * Actualizar fecha de último contacto
     */
    async updateLastContacted(id) {
        await this.debtorRepository.update(id, {
            lastContactedAt: new Date(),
        });
    }
    /**
     * Procesar archivo (CSV o Excel) y cargar deudores
     */
    async uploadFromFile(fileBuffer, filename) {
        const errors = [];
        let rows = [];
        try {
            // Detectar tipo de archivo y parsear
            if (filename.endsWith('.csv')) {
                rows = await this.parseCSV(fileBuffer);
            }
            else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
                rows = await this.parseExcel(fileBuffer);
            }
            else {
                throw new common_1.BadRequestException('Formato de archivo no soportado. Use CSV o Excel (.xlsx, .xls)');
            }
            this.logger.log(`📄 Archivo parseado: ${rows.length} registros encontrados`);
        }
        catch (error) {
            throw new common_1.BadRequestException(`Error al parsear archivo: ${error.message}`);
        }
        // Estadísticas
        let created = 0;
        let updated = 0;
        let duplicated = 0;
        let failed = 0;
        let totalDebt = 0;
        let totalDaysOverdue = 0;
        const byDocumentType = {};
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
                const debtorData = {
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
                }
                else {
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
            }
            catch (error) {
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
    async parseCSV(fileBuffer) {
        const results = [];
        await new Promise((resolve, reject) => {
            const stream = stream_1.Readable.from(fileBuffer.toString('utf-8'));
            stream
                .pipe((0, csv_parser_1.default)({ separator: ',' }))
                .on('data', (data) => {
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
    async parseExcel(fileBuffer) {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        return rawData.map(row => this.normalizeRowKeys(row));
    }
    /**
     * Normalizar keys de las filas (manejar variaciones de nombres)
     */
    normalizeRowKeys(row) {
        const getField = (variants) => {
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
    validateDebtorRow(row, rowNumber) {
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
    normalizeDocumentType(docType) {
        if (!docType)
            return null;
        const normalized = docType.toString().trim().toUpperCase();
        const mapping = {
            'CC': debtor_entity_1.DocumentType.CC,
            'CEDULA': debtor_entity_1.DocumentType.CC,
            'C.C': debtor_entity_1.DocumentType.CC,
            'CE': debtor_entity_1.DocumentType.CE,
            'C.E': debtor_entity_1.DocumentType.CE,
            'EXTRANJERIA': debtor_entity_1.DocumentType.CE,
            'NIT': debtor_entity_1.DocumentType.NIT,
            'TI': debtor_entity_1.DocumentType.TI,
            'T.I': debtor_entity_1.DocumentType.TI,
            'TARJETA': debtor_entity_1.DocumentType.TI,
            'PASSPORT': debtor_entity_1.DocumentType.PASSPORT,
            'PASAPORTE': debtor_entity_1.DocumentType.PASSPORT,
        };
        return mapping[normalized] || null;
    }
    /**
     * Parsear fecha en diferentes formatos
     */
    parseDate(dateStr) {
        if (!dateStr)
            return null;
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
        }
        catch {
            return null;
        }
    }
    /**
     * Procesar CSV (método legacy para compatibilidad)
     */
    async uploadFromCsv(fileBuffer) {
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
    async remove(id) {
        const debtor = await this.debtorRepository.findOne({ where: { id } });
        if (!debtor) {
            throw new common_1.NotFoundException(`Deudor con ID ${id} no encontrado`);
        }
        await this.debtorRepository.remove(debtor);
    }
};
exports.DebtorsService = DebtorsService;
exports.DebtorsService = DebtorsService = DebtorsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(debtor_entity_1.Debtor)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], DebtorsService);
