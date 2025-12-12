"use strict";
// Paz y Salvo Service - NGS&O CRM Gestión
// Generación y gestión de certificados de paz y salvo
// Desarrollado por: Alejandro Sandoval - AS Software
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
var PazYSalvoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PazYSalvoService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const paz_y_salvo_entity_1 = require("./entities/paz-y-salvo.entity");
const client_entity_1 = require("./entities/client.entity");
const client_identification_service_1 = require("./client-identification.service");
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let PazYSalvoService = PazYSalvoService_1 = class PazYSalvoService {
    constructor(pazYSalvoRepository, clientRepository, clientIdentificationService) {
        this.pazYSalvoRepository = pazYSalvoRepository;
        this.clientRepository = clientRepository;
        this.clientIdentificationService = clientIdentificationService;
        this.logger = new common_1.Logger(PazYSalvoService_1.name);
    }
    /**
     * Crear paz y salvo automáticamente cuando un cliente paga
     */
    async createPazYSalvo(clientId, paymentDate, paidAmount, metadata) {
        const client = await this.clientRepository.findOne({
            where: { id: clientId },
        });
        if (!client) {
            throw new common_1.NotFoundException('Cliente no encontrado');
        }
        // Verificar si ya existe un paz y salvo para este cliente
        const existing = await this.pazYSalvoRepository.findOne({
            where: { clientId },
        });
        if (existing) {
            this.logger.warn(`Ya existe un paz y salvo para ${client.fullName}`);
            return existing;
        }
        // Calcular fecha de disponibilidad (5 días hábiles después del pago)
        const availableFromDate = this.clientIdentificationService.calculateBusinessDays(new Date(paymentDate), 5);
        // Generar número de certificado único
        const certificateNumber = this.generateCertificateNumber();
        const pazYSalvo = this.pazYSalvoRepository.create({
            certificateNumber,
            clientId,
            paymentDate: new Date(paymentDate),
            paidAmount,
            availableFromDate,
            status: paz_y_salvo_entity_1.PazYSalvoStatus.PENDING,
            metadata,
        });
        await this.pazYSalvoRepository.save(pazYSalvo);
        this.logger.log(`📜 Paz y Salvo creado para ${client.fullName} - Disponible desde: ${availableFromDate.toLocaleDateString('es-CO')}`);
        return pazYSalvo;
    }
    /**
     * Verificar si el paz y salvo está disponible para descarga
     */
    async checkAvailability(clientId) {
        const pazYSalvo = await this.pazYSalvoRepository.findOne({
            where: { clientId },
            relations: ['client'],
        });
        if (!pazYSalvo) {
            return {
                isAvailable: false,
                message: 'No tienes un paz y salvo registrado',
            };
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const availableDate = new Date(pazYSalvo.availableFromDate);
        availableDate.setHours(0, 0, 0, 0);
        if (today >= availableDate) {
            // Actualizar estado a disponible si estaba en pending
            if (pazYSalvo.status === paz_y_salvo_entity_1.PazYSalvoStatus.PENDING) {
                pazYSalvo.status = paz_y_salvo_entity_1.PazYSalvoStatus.AVAILABLE;
                await this.pazYSalvoRepository.save(pazYSalvo);
            }
            return {
                isAvailable: true,
                pazYSalvo,
                message: 'Tu paz y salvo está disponible para descarga',
            };
        }
        // Calcular días restantes
        const daysRemaining = Math.ceil((availableDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
            isAvailable: false,
            pazYSalvo,
            message: `Tu paz y salvo estará disponible en ${daysRemaining} día(s)`,
            daysRemaining,
        };
    }
    /**
     * Generar PDF del paz y salvo
     */
    async generatePDF(pazYSalvoId, userId) {
        const pazYSalvo = await this.pazYSalvoRepository.findOne({
            where: { id: pazYSalvoId },
            relations: ['client'],
        });
        if (!pazYSalvo) {
            throw new common_1.NotFoundException('Paz y salvo no encontrado');
        }
        // Verificar disponibilidad
        const { isAvailable } = await this.checkAvailability(pazYSalvo.clientId);
        if (!isAvailable) {
            throw new common_1.BadRequestException('El paz y salvo aún no está disponible para descarga');
        }
        // Crear directorio si no existe
        const pdfDir = path.join(process.cwd(), 'uploads', 'paz-y-salvos');
        if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
        }
        const fileName = `paz-y-salvo-${pazYSalvo.certificateNumber}.pdf`;
        const filePath = path.join(pdfDir, fileName);
        // Si ya existe el PDF, devolverlo
        if (pazYSalvo.filePath && fs.existsSync(path.join(process.cwd(), pazYSalvo.filePath))) {
            return pazYSalvo.filePath;
        }
        // Generar PDF
        await this.createPDF(pazYSalvo, filePath);
        // Actualizar registro
        pazYSalvo.filePath = `/uploads/paz-y-salvos/${fileName}`;
        pazYSalvo.generatedBy = userId;
        await this.pazYSalvoRepository.save(pazYSalvo);
        this.logger.log(`📄 PDF generado: ${fileName}`);
        return pazYSalvo.filePath;
    }
    /**
     * Registrar descarga del paz y salvo
     */
    async registerDownload(pazYSalvoId, userId) {
        const pazYSalvo = await this.pazYSalvoRepository.findOne({
            where: { id: pazYSalvoId },
        });
        if (!pazYSalvo) {
            throw new common_1.NotFoundException('Paz y salvo no encontrado');
        }
        pazYSalvo.status = paz_y_salvo_entity_1.PazYSalvoStatus.DOWNLOADED;
        pazYSalvo.downloadedAt = new Date();
        pazYSalvo.downloadedBy = userId;
        await this.pazYSalvoRepository.save(pazYSalvo);
        this.logger.log(`📥 Paz y salvo descargado: ${pazYSalvo.certificateNumber}`);
    }
    /**
     * Crear el PDF del certificado
     */
    async createPDF(pazYSalvo, filePath) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ size: 'LETTER', margin: 50 });
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);
            // Header con logo y título
            doc
                .fontSize(24)
                .font('Helvetica-Bold')
                .fillColor('#1976d2')
                .text('CERTIFICADO DE PAZ Y SALVO', { align: 'center' })
                .moveDown(0.5);
            doc
                .fontSize(12)
                .font('Helvetica')
                .fillColor('#666')
                .text(`Certificado No. ${pazYSalvo.certificateNumber}`, { align: 'center' })
                .moveDown(2);
            // Información del cliente
            doc.fontSize(14).fillColor('#000').font('Helvetica-Bold');
            doc.text('DATOS DEL CLIENTE', { underline: true }).moveDown(0.5);
            doc.fontSize(11).font('Helvetica');
            doc.text(`Nombre: ${pazYSalvo.client.fullName || 'N/A'}`);
            doc.text(`Documento: ${pazYSalvo.client.documentNumber || 'N/A'}`);
            doc.text(`Teléfono: ${pazYSalvo.client.phone || 'N/A'}`);
            doc.moveDown(1.5);
            // Información del pago
            doc.fontSize(14).font('Helvetica-Bold');
            doc.text('INFORMACIÓN DEL PAGO', { underline: true }).moveDown(0.5);
            doc.fontSize(11).font('Helvetica');
            const formattedAmount = new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
            }).format(pazYSalvo.paidAmount);
            doc.text(`Monto Pagado: ${formattedAmount}`);
            doc.text(`Fecha de Pago: ${new Date(pazYSalvo.paymentDate).toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })}`);
            if (pazYSalvo.metadata?.originalDebtAmount) {
                const originalAmount = new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                }).format(pazYSalvo.metadata.originalDebtAmount);
                doc.text(`Deuda Original: ${originalAmount}`);
            }
            doc.moveDown(2);
            // Declaración oficial
            doc
                .fontSize(12)
                .font('Helvetica-Bold')
                .fillColor('#1976d2')
                .text('DECLARACIÓN', { align: 'center' })
                .moveDown(0.5);
            doc
                .fontSize(11)
                .font('Helvetica')
                .fillColor('#000')
                .text(`Por medio del presente documento, certificamos que ${pazYSalvo.client.fullName || 'el cliente'} ` +
                `identificado(a) con documento de identidad No. ${pazYSalvo.client.documentNumber || 'N/A'}, ` +
                `se encuentra a PAZ Y SALVO con nuestra entidad por concepto de obligaciones financieras.`, { align: 'justify' })
                .moveDown(1);
            doc
                .text(`El cliente ha cancelado satisfactoriamente la totalidad de su deuda por un valor de ${formattedAmount}, ` +
                `quedando sin ningún saldo pendiente a la fecha de expedición del presente certificado.`, { align: 'justify' })
                .moveDown(2);
            // Fecha de expedición
            doc
                .fontSize(10)
                .text(`Fecha de expedición: ${new Date().toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'America/Bogota',
            })}`, { align: 'right' })
                .moveDown(3);
            // Firma
            doc.fontSize(10);
            doc.text('_________________________________', { align: 'center' });
            doc.text('Firma Autorizada', { align: 'center' });
            doc.text('NGS&O - Sistema CRM', { align: 'center' });
            // Footer
            doc
                .fontSize(8)
                .fillColor('#999')
                .text('Este documento es válido sin necesidad de firma manuscrita. Puede ser verificado con el número de certificado.', 50, doc.page.height - 50, { align: 'center', width: doc.page.width - 100 });
            doc.end();
            stream.on('finish', () => resolve());
            stream.on('error', (error) => reject(error));
        });
    }
    /**
     * Generar número de certificado único
     */
    generateCertificateNumber() {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0');
        return `PYS-${timestamp.slice(-8)}${random}`;
    }
    /**
     * Obtener paz y salvo por cliente
     */
    async getByClientId(clientId) {
        return this.pazYSalvoRepository.findOne({
            where: { clientId },
            relations: ['client'],
        });
    }
};
exports.PazYSalvoService = PazYSalvoService;
exports.PazYSalvoService = PazYSalvoService = PazYSalvoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(paz_y_salvo_entity_1.PazYSalvo)),
    __param(1, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        client_identification_service_1.ClientIdentificationService])
], PazYSalvoService);
