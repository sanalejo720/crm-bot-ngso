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
exports.BotFlow = exports.BotFlowStatus = void 0;
const typeorm_1 = require("typeorm");
const bot_node_entity_1 = require("./bot-node.entity");
var BotFlowStatus;
(function (BotFlowStatus) {
    BotFlowStatus["ACTIVE"] = "active";
    BotFlowStatus["INACTIVE"] = "inactive";
    BotFlowStatus["DRAFT"] = "draft";
})(BotFlowStatus || (exports.BotFlowStatus = BotFlowStatus = {}));
let BotFlow = class BotFlow {
};
exports.BotFlow = BotFlow;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BotFlow.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], BotFlow.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BotFlow.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: BotFlowStatus,
        default: BotFlowStatus.DRAFT,
    }),
    __metadata("design:type", String)
], BotFlow.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BotFlow.prototype, "startNodeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], BotFlow.prototype, "variables", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], BotFlow.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => bot_node_entity_1.BotNode, (node) => node.flow, { cascade: true }),
    __metadata("design:type", Array)
], BotFlow.prototype, "nodes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BotFlow.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BotFlow.prototype, "updatedAt", void 0);
exports.BotFlow = BotFlow = __decorate([
    (0, typeorm_1.Entity)('bot_flows'),
    (0, typeorm_1.Index)(['status'])
], BotFlow);
