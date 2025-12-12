"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateDebtorDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const debtor_entity_1 = require("../entities/debtor.entity");
class CreateDebtorDto {
}
exports.CreateDebtorDto = CreateDebtorDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Juan Pérez García' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDebtorDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: debtor_entity_1.DocumentType.CC, enum: debtor_entity_1.DocumentType }),
    (0, class_validator_1.IsEnum)(debtor_entity_1.DocumentType),
    __metadata("design:type", String)
], CreateDebtorDto.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1234567890' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDebtorDto.prototype, "documentNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '3001234567' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDebtorDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'juan.perez@email.com' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDebtorDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Calle 123 #45-67' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDebtorDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1500000 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateDebtorDto.prototype, "debtAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2000000 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateDebtorDto.prototype, "initialDebtAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 45 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateDebtorDto.prototype, "daysOverdue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2025-01-15' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateDebtorDto.prototype, "lastPaymentDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2025-12-30' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateDebtorDto.prototype, "promiseDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'active' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDebtorDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Cliente con historial de cumplimiento' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDebtorDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: {
            producto: 'Crédito Personal',
            numeroCredito: 'CRE-2024-001',
            fechaVencimiento: '2024-12-31',
        },
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateDebtorDto.prototype, "metadata", void 0);
