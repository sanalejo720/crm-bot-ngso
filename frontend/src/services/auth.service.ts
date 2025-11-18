// Auth Service - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import apiService from './api';
import type { 
  LoginRequest, 
  LoginResponse, 
  User, 
  ApiResponse 
} from '../types';

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiService.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      credentials
    );
    
    // Backend devuelve { success, data: { accessToken, user } }
    const result = response.data || response;
    const data = result.data || result;
    
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  }

  async verify2FA(token: string): Promise<LoginResponse> {
    const response = await apiService.post<ApiResponse<LoginResponse>>(
      '/auth/2fa/verify',
      { token }
    );
    
    const result = response.data || response;
    const data = result.data || result;
    
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  }

  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<ApiResponse<User>>('/auth/me');
    const result = response.data || response;
    return result.data || result;
  }

  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<ApiResponse<{ accessToken: string }>>(
      '/auth/refresh',
      { refreshToken }
    );
    
    const result = response.data || response;
    const data = result.data || result;
    
    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  hasPermission(permission: string): boolean {
    const user = this.getStoredUser();
    if (!user || !user.role || !user.role.permissions) return false;
    
    return user.role.permissions.some(p => p.name === permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  hasRole(roleName: string): boolean {
    const user = this.getStoredUser();
    return user?.role?.name === roleName;
  }

  isAgent(): boolean {
    const user = this.getStoredUser();
    return user?.isAgent || false;
  }
}

export const authService = new AuthService();
export default authService;
