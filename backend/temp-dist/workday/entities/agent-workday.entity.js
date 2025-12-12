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
exports.AgentWorkday = exports.WorkdayStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const agent_pause_entity_1 = require("./agent-pause.entity");
const agent_workday_event_entity_1 = require("./agent-workday-event.entity");
var WorkdayStatus;
(function (WorkdayStatus) {
    WorkdayStatus["OFFLINE"] = "offline";
    WorkdayStatus["WORKING"] = "working";
    WorkdayStatus["ON_PAUSE"] = "on_pause";
})(WorkdayStatus || (exports.WorkdayStatus = WorkdayStatus = {}));
let AgentWorkday = class AgentWorkday {
};
exports.AgentWorkday = AgentWorkday;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AgentWorkday.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], AgentWorkday.prototype, "agentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'agentId' }),
    __metadata("design:type", user_entity_1.User)
], AgentWorkday.prototype, "agent", void 0);
__decorate([
    (0, typeorm_1.Column)('date'),
    __metadata("design:type", Date)
], AgentWorkday.prototype, "workDate", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamp', { nullable: true }),
    __metadata("design:type", Date)
], AgentWorkday.prototype, "clockInTime", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamp', { nullable: true }),
    __metadata("design:type", Date)
], AgentWorkday.prototype, "clockOutTime", void 0);
__decorate([
    (0, typeorm_1.Column)('integer', { default: 0 }),
    __metadata("design:type", Number)
], AgentWorkday.prototype, "totalWorkMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)('integer', { default: 0 }),
    __metadata("design:type", Number)
], AgentWorkday.prototype, "totalPauseMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)('integer', { default: 0 }),
    __metadata("design:type", Number)
], AgentWorkday.prototype, "totalProductiveMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 50,
        default: WorkdayStatus.OFFLINE,
    }),
    __metadata("design:type", String)
], AgentWorkday.prototype, "currentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)('integer', { default: 0 }),
    __metadata("design:type", Number)
], AgentWorkday.prototype, "chatsHandled", void 0);
__decorate([
    (0, typeorm_1.Column)('integer', { default: 0 }),
    __metadata("design:type", Number)
], AgentWorkday.prototype, "messagesSent", void 0);
__decorate([
    (0, typeorm_1.Column)('integer', { default: 0 }),
    __metadata("design:type", Number)
], AgentWorkday.prototype, "avgResponseTimeSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], AgentWorkday.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => agent_pause_entity_1.AgentPause, (pause) => pause.workday),
    __metadata("design:type", Array)
], AgentWorkday.prototype, "pauses", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => agent_workday_event_entity_1.AgentWorkdayEvent, (event) => event.workday),
    __metadata("design:type", Array)
], AgentWorkday.prototype, "events", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AgentWorkday.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AgentWorkday.prototype, "updatedAt", void 0);
exports.AgentWorkday = AgentWorkday = __decorate([
    (0, typeorm_1.Entity)('agent_workdays')
], AgentWorkday);
