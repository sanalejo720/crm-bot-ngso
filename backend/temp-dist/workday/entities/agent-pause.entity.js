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
exports.AgentPause = exports.PauseType = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const agent_workday_entity_1 = require("./agent-workday.entity");
var PauseType;
(function (PauseType) {
    PauseType["LUNCH"] = "lunch";
    PauseType["BREAK"] = "break";
    PauseType["BATHROOM"] = "bathroom";
    PauseType["MEETING"] = "meeting";
    PauseType["OTHER"] = "other";
})(PauseType || (exports.PauseType = PauseType = {}));
let AgentPause = class AgentPause {
};
exports.AgentPause = AgentPause;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AgentPause.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], AgentPause.prototype, "workdayId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agent_workday_entity_1.AgentWorkday, (workday) => workday.pauses),
    (0, typeorm_1.JoinColumn)({ name: 'workdayId' }),
    __metadata("design:type", agent_workday_entity_1.AgentWorkday)
], AgentPause.prototype, "workday", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], AgentPause.prototype, "agentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'agentId' }),
    __metadata("design:type", user_entity_1.User)
], AgentPause.prototype, "agent", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 50,
    }),
    __metadata("design:type", String)
], AgentPause.prototype, "pauseType", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamp'),
    __metadata("design:type", Date)
], AgentPause.prototype, "startTime", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamp', { nullable: true }),
    __metadata("design:type", Date)
], AgentPause.prototype, "endTime", void 0);
__decorate([
    (0, typeorm_1.Column)('integer', { nullable: true }),
    __metadata("design:type", Number)
], AgentPause.prototype, "durationMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], AgentPause.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AgentPause.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AgentPause.prototype, "updatedAt", void 0);
exports.AgentPause = AgentPause = __decorate([
    (0, typeorm_1.Entity)('agent_pauses')
], AgentPause);
