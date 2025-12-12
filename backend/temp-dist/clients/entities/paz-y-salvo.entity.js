"use strict";
// Paz y Salvo Entity - NGS&O CRM Gestión
// Entidad para certificados de paz y salvo
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PazYSalvo = exports.PazYSalvoStatus = void 0;
const typeorm_1 = require("typeorm");
const client_entity_1 = require("../../clients/entities/client.entity");
const user_entity_1 = require("../../users/entities/user.entity");
var PazYSalvoStatus;
(function (PazYSalvoStatus) {
    PazYSalvoStatus["PENDING"] = "pending";
    PazYSalvoStatus["AVAILABLE"] = "available";
    PazYSalvoStatus["DOWNLOADED"] = "downloaded";
})(PazYSalvoStatus || (exports.PazYSalvoStatus = PazYSalvoStatus = {}));
let PazYSalvo = class PazYSalvo {
};
exports.PazYSalvo = PazYSalvo;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PazYSalvo.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 100 }),
    __metadata("design:type", String)
], PazYSalvo.prototype, "certificateNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PazYSalvo.prototype, "clientId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client),
    (0, typeorm_1.JoinColumn)({ name: 'clientId' }),
    __metadata("design:type", client_entity_1.Client)
], PazYSalvo.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], PazYSalvo.prototype, "paymentDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], PazYSalvo.prototype, "paidAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], PazYSalvo.prototype, "availableFromDate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PazYSalvoStatus,
        default: PazYSalvoStatus.PENDING,
    }),
    __metadata("design:type", String)
], PazYSalvo.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PazYSalvo.prototype, "filePath", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], PazYSalvo.prototype, "generatedBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'generatedBy' }),
    __metadata("design:type", user_entity_1.User)
], PazYSalvo.prototype, "generator", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], PazYSalvo.prototype, "downloadedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], PazYSalvo.prototype, "downloadedBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'downloadedBy' }),
    __metadata("design:type", user_entity_1.User)
], PazYSalvo.prototype, "downloader", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PazYSalvo.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PazYSalvo.prototype, "createdAt", void 0);
exports.PazYSalvo = PazYSalvo = __decorate([
    (0, typeorm_1.Entity)('paz_y_salvos'),
    (0, typeorm_1.Index)(['clientId', 'status'])
], PazYSalvo);
