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
exports.Chat = exports.ChatChannel = exports.ChatStatus = void 0;
const typeorm_1 = require("typeorm");
const campaign_entity_1 = require("../../campaigns/entities/campaign.entity");
const whatsapp_number_entity_1 = require("../../whatsapp/entities/whatsapp-number.entity");
const user_entity_1 = require("../../users/entities/user.entity");
const client_entity_1 = require("../../clients/entities/client.entity");
const message_entity_1 = require("../../messages/entities/message.entity");
var ChatStatus;
(function (ChatStatus) {
    ChatStatus["WAITING"] = "waiting";
    ChatStatus["BOT"] = "bot";
    ChatStatus["ACTIVE"] = "active";
    ChatStatus["PENDING"] = "pending";
    ChatStatus["RESOLVED"] = "resolved";
    ChatStatus["CLOSED"] = "closed";
})(ChatStatus || (exports.ChatStatus = ChatStatus = {}));
var ChatChannel;
(function (ChatChannel) {
    ChatChannel["WHATSAPP"] = "whatsapp";
})(ChatChannel || (exports.ChatChannel = ChatChannel = {}));
let Chat = class Chat {
};
exports.Chat = Chat;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Chat.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 100 }),
    __metadata("design:type", String)
], Chat.prototype, "externalId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], Chat.prototype, "contactPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 100 }),
    __metadata("design:type", String)
], Chat.prototype, "contactName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ChatChannel,
        default: ChatChannel.WHATSAPP,
    }),
    __metadata("design:type", String)
], Chat.prototype, "channel", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ChatStatus,
        default: ChatStatus.WAITING,
    }),
    __metadata("design:type", String)
], Chat.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "lastMessageText", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "lastMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Chat.prototype, "lastMessageAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Chat.prototype, "unreadCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Chat.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Chat.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Chat.prototype, "assignedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Chat.prototype, "firstResponseAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Chat.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Chat.prototype, "closedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Chat.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Chat.prototype, "botContext", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => campaign_entity_1.Campaign, (campaign) => campaign.chats),
    (0, typeorm_1.JoinColumn)({ name: 'campaignId' }),
    __metadata("design:type", campaign_entity_1.Campaign)
], Chat.prototype, "campaign", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Chat.prototype, "campaignId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => whatsapp_number_entity_1.WhatsappNumber, (number) => number.chats, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'whatsappNumberId' }),
    __metadata("design:type", whatsapp_number_entity_1.WhatsappNumber)
], Chat.prototype, "whatsappNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "whatsappNumberId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.assignedChats, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'assignedAgentId' }),
    __metadata("design:type", user_entity_1.User)
], Chat.prototype, "assignedAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "assignedAgentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, (client) => client.chats, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'clientId' }),
    __metadata("design:type", client_entity_1.Client)
], Chat.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "clientId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "debtorId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => message_entity_1.Message, (message) => message.chat),
    __metadata("design:type", Array)
], Chat.prototype, "messages", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sub_status', nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "subStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_bot_active', default: false }),
    __metadata("design:type", Boolean)
], Chat.prototype, "isBotActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_agent_message_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Chat.prototype, "lastAgentMessageAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_client_message_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Chat.prototype, "lastClientMessageAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'first_response_time_seconds', nullable: true }),
    __metadata("design:type", Number)
], Chat.prototype, "firstResponseTimeSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'agent_warning_sent', default: false }),
    __metadata("design:type", Boolean)
], Chat.prototype, "agentWarningSent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'client_warning_sent', default: false }),
    __metadata("design:type", Boolean)
], Chat.prototype, "clientWarningSent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'auto_close_scheduled_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Chat.prototype, "autoCloseScheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'transfer_count', default: 0 }),
    __metadata("design:type", Number)
], Chat.prototype, "transferCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bot_restart_count', default: 0 }),
    __metadata("design:type", Number)
], Chat.prototype, "botRestartCount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Chat.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Chat.prototype, "updatedAt", void 0);
exports.Chat = Chat = __decorate([
    (0, typeorm_1.Entity)('chats'),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['assignedAgentId']),
    (0, typeorm_1.Index)(['createdAt'])
], Chat);
