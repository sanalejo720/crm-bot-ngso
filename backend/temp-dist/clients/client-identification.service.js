"use strict";
// Client Identification Service - NGS&O CRM Gestión
// Identificación de clientes por documento desde cualquier número
// Desarrollado por: Alejandro Sandoval - AS Software
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ClientIdentificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientIdentificationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const client_entity_1 = require("./entities/client.entity");
const client_phone_number_entity_1 = require("./entities/client-phone-number.entity");
const chat_entity_1 = require("../chats/entities/chat.entity");
let ClientIdentificationService = ClientIdentificationService_1 = class ClientIdentificationService {
    constructor(clientRepository, phoneRepository, chatRepository) {
        this.clientRepository = clientRepository;
        this.phoneRepository = phoneRepository;
        this.chatRepository = chatRepository;
        this.logger = new common_1.Logger(ClientIdentificationService_1.name);
    }
    /**
     * Identificar cliente por número de documento
     * y vincular el número de WhatsApp si es nuevo
     */
    async identifyClientByDocument(documentNumber, phoneNumber) {
        // Buscar cliente por documento
        const client = await this.clientRepository.findOne({
            where: { documentNumber },
            relations: ['phoneNumbers'],
        });
        if (!client) {
            throw new common_1.NotFoundException(`Cliente con documento ${documentNumber} no encontrado`);
        }
        // Verificar si el número ya está registrado
        let phoneRecord = await this.phoneRepository.findOne({
            where: { clientId: client.id, phoneNumber },
        });
        const isNewPhone = !phoneRecord;
        if (!phoneRecord) {
            // Agregar nuevo número al cliente
            phoneRecord = this.phoneRepository.create({
                clientId: client.id,
                phoneNumber,
                isPrimary: false, // Los números adicionales no son primarios
                isActive: true,
                notes: 'Número agregado automáticamente al contactarse',
                lastContactAt: new Date(),
            });
            await this.phoneRepository.save(phoneRecord);
            this.logger.log(`📱 Nuevo número vinculado: ${phoneNumber} → Cliente: ${client.fullName}`);
        }
        else {
            // Actualizar fecha de último contacto
            phoneRecord.lastContactAt = new Date();
            await this.phoneRepository.save(phoneRecord);
        }
        // Actualizar el teléfono principal del cliente si es diferente
        if (client.phone !== phoneNumber) {
            client.phone = phoneNumber;
            await this.clientRepository.save(client);
            this.logger.log(`🔄 Teléfono actualizado para ${client.fullName}: ${phoneNumber}`);
        }
        // Actualizar el chat existente si hay uno
        const activeChat = await this.chatRepository.findOne({
            where: { contactPhone: phoneNumber },
            order: { createdAt: 'DESC' },
        });
        if (activeChat && !activeChat.clientId) {
            activeChat.clientId = client.id;
            await this.chatRepository.save(activeChat);
            this.logger.log(`✅ Chat vinculado al cliente identificado: ${client.fullName}`);
        }
        return { client, isNewPhone };
    }
    /**
     * Obtener todos los números de un cliente
     */
    async getClientPhoneNumbers(clientId) {
        return this.phoneRepository.find({
            where: { clientId, isActive: true },
            order: { isPrimary: 'DESC', createdAt: 'DESC' },
        });
    }
    /**
     * Buscar cliente por cualquiera de sus números registrados
     */
    async findClientByPhone(phoneNumber) {
        const phoneRecord = await this.phoneRepository.findOne({
            where: { phoneNumber, isActive: true },
            relations: ['client'],
        });
        return phoneRecord?.client || null;
    }
    /**
     * Calcular días hábiles desde una fecha
     * (Excluye sábados, domingos y festivos colombianos básicos)
     */
    calculateBusinessDays(startDate, daysToAdd) {
        const result = new Date(startDate);
        let daysAdded = 0;
        // Festivos fijos de Colombia 2025-2026 (simplificado)
        const holidays = [
            '2025-01-01', // Año Nuevo
            '2025-01-06', // Reyes Magos
            '2025-03-24', // San José
            '2025-04-17', // Jueves Santo
            '2025-04-18', // Viernes Santo
            '2025-05-01', // Día del Trabajo
            '2025-06-02', // Ascensión
            '2025-06-23', // Corpus Christi
            '2025-06-30', // Sagrado Corazón
            '2025-07-20', // Independencia
            '2025-08-07', // Batalla de Boyacá
            '2025-08-18', // Asunción
            '2025-10-13', // Día de la Raza
            '2025-11-03', // Todos los Santos
            '2025-11-17', // Independencia de Cartagena
            '2025-12-08', // Inmaculada Concepción
            '2025-12-25', // Navidad
        ];
        while (daysAdded < daysToAdd) {
            result.setDate(result.getDate() + 1);
            const dayOfWeek = result.getDay();
            const dateStr = result.toISOString().split('T')[0];
            // Saltar sábados (6), domingos (0) y festivos
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateStr)) {
                daysAdded++;
            }
        }
        return result;
    }
};
exports.ClientIdentificationService = ClientIdentificationService;
exports.ClientIdentificationService = ClientIdentificationService = ClientIdentificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __param(1, (0, typeorm_1.InjectRepository)(client_phone_number_entity_1.ClientPhoneNumber)),
    __param(2, (0, typeorm_1.InjectRepository)(chat_entity_1.Chat)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ClientIdentificationService);
