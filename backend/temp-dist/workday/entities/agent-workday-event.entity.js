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
exports.AgentWorkdayEvent = exports.WorkdayEventType = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const agent_workday_entity_1 = require("./agent-workday.entity");
var WorkdayEventType;
(function (WorkdayEventType) {
    WorkdayEventType["CLOCK_IN"] = "clock_in";
    WorkdayEventType["CLOCK_OUT"] = "clock_out";
    WorkdayEventType["PAUSE_START"] = "pause_start";
    WorkdayEventType["PAUSE_END"] = "pause_end";
    WorkdayEventType["STATUS_CHANGE"] = "status_change";
})(WorkdayEventType || (exports.WorkdayEventType = WorkdayEventType = {}));
let AgentWorkdayEvent = class AgentWorkdayEvent {
};
exports.AgentWorkdayEvent = AgentWorkdayEvent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AgentWorkdayEvent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { nullable: true }),
    __metadata("design:type", String)
], AgentWorkdayEvent.prototype, "workdayId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agent_workday_entity_1.AgentWorkday, (workday) => workday.events),
    (0, typeorm_1.JoinColumn)({ name: 'workdayId' }),
    __metadata("design:type", agent_workday_entity_1.AgentWorkday)
], AgentWorkdayEvent.prototype, "workday", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], AgentWorkdayEvent.prototype, "agentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'agentId' }),
    __metadata("design:type", user_entity_1.User)
], AgentWorkdayEvent.prototype, "agent", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 50,
    }),
    __metadata("design:type", String)
], AgentWorkdayEvent.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], AgentWorkdayEvent.prototype, "eventData", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamp', { default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], AgentWorkdayEvent.prototype, "eventTime", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AgentWorkdayEvent.prototype, "createdAt", void 0);
exports.AgentWorkdayEvent = AgentWorkdayEvent = __decorate([
    (0, typeorm_1.Entity)('agent_workday_events')
], AgentWorkdayEvent);
