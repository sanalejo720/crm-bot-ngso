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
exports.BotNode = exports.BotNodeType = void 0;
const typeorm_1 = require("typeorm");
const bot_flow_entity_1 = require("./bot-flow.entity");
var BotNodeType;
(function (BotNodeType) {
    BotNodeType["MESSAGE"] = "message";
    BotNodeType["MENU"] = "menu";
    BotNodeType["INPUT"] = "input";
    BotNodeType["CONDITION"] = "condition";
    BotNodeType["API_CALL"] = "api_call";
    BotNodeType["TRANSFER_AGENT"] = "transfer_agent";
    BotNodeType["END"] = "end";
})(BotNodeType || (exports.BotNodeType = BotNodeType = {}));
let BotNode = class BotNode {
};
exports.BotNode = BotNode;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BotNode.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], BotNode.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: BotNodeType,
    }),
    __metadata("design:type", String)
], BotNode.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], BotNode.prototype, "config", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BotNode.prototype, "nextNodeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BotNode.prototype, "positionX", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BotNode.prototype, "positionY", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => bot_flow_entity_1.BotFlow, (flow) => flow.nodes, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'flowId' }),
    __metadata("design:type", bot_flow_entity_1.BotFlow)
], BotNode.prototype, "flow", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BotNode.prototype, "flowId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BotNode.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BotNode.prototype, "updatedAt", void 0);
exports.BotNode = BotNode = __decorate([
    (0, typeorm_1.Entity)('bot_nodes')
], BotNode);
