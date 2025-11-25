import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface BotFlow {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'draft';
  startNodeId?: string;
  variables?: Record<string, any>;
  settings?: Record<string, any>;
  nodes?: BotNode[];
  createdAt: string;
  updatedAt: string;
}

export interface BotNode {
  id: string;
  name: string;
  type: 'message' | 'menu' | 'input' | 'condition' | 'api_call' | 'transfer_agent' | 'end';
  config: Record<string, any>;
  nextNodeId?: string;
  positionX: number;
  positionY: number;
  flowId: string;
}

export interface CreateBotFlowDto {
  name: string;
  description?: string;
  status?: 'active' | 'inactive' | 'draft';
  startNodeId?: string;
  variables?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface CreateBotNodeDto {
  name: string;
  type: string;
  config: Record<string, any>;
  nextNodeId?: string;
  positionX?: number;
  positionY?: number;
}

class BotFlowsService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  async getFlows(status?: string, page = 1, limit = 50) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await axios.get(`${API_URL}/bot-flows?${params}`, this.getAuthHeaders());
    return response.data;
  }

  async getFlow(id: string) {
    const response = await axios.get(`${API_URL}/bot-flows/${id}`, this.getAuthHeaders());
    return response.data;
  }

  async createFlow(data: CreateBotFlowDto) {
    const response = await axios.post(`${API_URL}/bot-flows`, data, this.getAuthHeaders());
    return response.data;
  }

  async updateFlow(id: string, data: Partial<CreateBotFlowDto>) {
    const response = await axios.put(`${API_URL}/bot-flows/${id}`, data, this.getAuthHeaders());
    return response.data;
  }

  async deleteFlow(id: string) {
    const response = await axios.delete(`${API_URL}/bot-flows/${id}`, this.getAuthHeaders());
    return response.data;
  }

  async duplicateFlow(id: string) {
    const response = await axios.post(`${API_URL}/bot-flows/${id}/duplicate`, {}, this.getAuthHeaders());
    return response.data;
  }

  async publishFlow(id: string) {
    const response = await axios.post(`${API_URL}/bot-flows/${id}/publish`, {}, this.getAuthHeaders());
    return response.data;
  }

  async getStats(id: string) {
    const response = await axios.get(`${API_URL}/bot-flows/${id}/stats`, this.getAuthHeaders());
    return response.data;
  }

  // Nodes
  async createNode(flowId: string, data: CreateBotNodeDto) {
    const response = await axios.post(`${API_URL}/bot-flows/${flowId}/nodes`, data, this.getAuthHeaders());
    return response.data;
  }

  async createNodesBulk(flowId: string, nodes: CreateBotNodeDto[]) {
    const response = await axios.post(`${API_URL}/bot-flows/${flowId}/nodes/bulk`, { nodes }, this.getAuthHeaders());
    return response.data;
  }

  async updateNode(flowId: string, nodeId: string, data: Partial<CreateBotNodeDto>) {
    const response = await axios.put(`${API_URL}/bot-flows/${flowId}/nodes/${nodeId}`, data, this.getAuthHeaders());
    return response.data;
  }

  async deleteNode(flowId: string, nodeId: string) {
    const response = await axios.delete(`${API_URL}/bot-flows/${flowId}/nodes/${nodeId}`, this.getAuthHeaders());
    return response.data;
  }
}

export const botFlowsService = new BotFlowsService();
