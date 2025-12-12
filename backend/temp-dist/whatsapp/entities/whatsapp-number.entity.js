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
exports.WhatsappNumber = exports.ConnectionStatus = exports.WhatsappProvider = void 0;
const typeorm_1 = require("typeorm");
const class_transformer_1 = require("class-transformer");
const campaign_entity_1 = require("../../campaigns/entities/campaign.entity");
const chat_entity_1 = require("../../chats/entities/chat.entity");
const bot_flow_entity_1 = require("../../bot/entities/bot-flow.entity");
var WhatsappProvider;
(function (WhatsappProvider) {
    WhatsappProvider["META_CLOUD"] = "meta";
    WhatsappProvider["WPPCONNECT"] = "wppconnect";
    WhatsappProvider["TWILIO"] = "twilio";
})(WhatsappProvider || (exports.WhatsappProvider = WhatsappProvider = {}));
var ConnectionStatus;
(function (ConnectionStatus) {
    ConnectionStatus["CONNECTED"] = "connected";
    ConnectionStatus["DISCONNECTED"] = "disconnected";
    ConnectionStatus["CONNECTING"] = "connecting";
    ConnectionStatus["QR_WAITING"] = "qr_waiting";
    ConnectionStatus["ERROR"] = "error";
})(ConnectionStatus || (exports.ConnectionStatus = ConnectionStatus = {}));
let WhatsappNumber = class WhatsappNumber {
};
exports.WhatsappNumber = WhatsappNumber;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 20 }),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: WhatsappProvider,
    }),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ConnectionStatus,
        default: ConnectionStatus.DISCONNECTED,
    }),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "phoneNumberId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "accessToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "sessionName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "apiKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "serverUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "twilioAccountSid", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "twilioAuthToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "twilioPhoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "qrCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], WhatsappNumber.prototype, "lastConnectedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], WhatsappNumber.prototype, "webhookConfig", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], WhatsappNumber.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], WhatsappNumber.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => campaign_entity_1.Campaign, (campaign) => campaign.whatsappNumbers),
    (0, typeorm_1.JoinColumn)({ name: 'campaignId' }),
    __metadata("design:type", campaign_entity_1.Campaign)
], WhatsappNumber.prototype, "campaign", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "campaignId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => bot_flow_entity_1.BotFlow, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'botFlowId' }),
    __metadata("design:type", bot_flow_entity_1.BotFlow)
], WhatsappNumber.prototype, "botFlow", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WhatsappNumber.prototype, "botFlowId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => chat_entity_1.Chat, (chat) => chat.whatsappNumber),
    __metadata("design:type", Array)
], WhatsappNumber.prototype, "chats", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WhatsappNumber.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], WhatsappNumber.prototype, "updatedAt", void 0);
exports.WhatsappNumber = WhatsappNumber = __decorate([
    (0, typeorm_1.Entity)('whatsapp_numbers'),
    (0, typeorm_1.Index)(['phoneNumber'], { unique: true }),
    (0, typeorm_1.Index)(['status'])
], WhatsappNumber);
