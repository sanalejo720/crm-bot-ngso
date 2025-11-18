// Auth Slice - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User, LoginRequest, AgentState } from '../../types/index';
import { authService } from '../../services/auth.service';
import { socketService } from '../../services/socket.service';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  requires2FA: boolean;
}

const initialState: AuthState = {
  user: authService.getStoredUser(),
  isAuthenticated: authService.isAuthenticated(),
  isLoading: false,
  error: null,
  requires2FA: false,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      
      // Si no requiere 2FA, conectar socket
      if (!response.requires2FA) {
        const token = localStorage.getItem('accessToken');
        if (token) {
          socketService.connect(token);
        }
      }
      
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error en login');
    }
  }
);

export const verify2FA = createAsyncThunk(
  'auth/verify2FA',
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await authService.verify2FA(token);
      
      // Conectar socket después de 2FA
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        socketService.connect(accessToken);
      }
      
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Código 2FA inválido');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      socketService.disconnect();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error en logout');
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.getCurrentUser();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error obteniendo usuario');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    updateAgentState: (state, action: PayloadAction<AgentState>) => {
      if (state.user) {
        state.user.agentState = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoading = false;
      state.requires2FA = action.payload.requires2FA;
      
      if (!action.payload.requires2FA) {
        state.user = action.payload.user;
        state.isAuthenticated = true;
      }
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
      state.isAuthenticated = false;
    });

    // 2FA
    builder.addCase(verify2FA.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(verify2FA.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.requires2FA = false;
    });
    builder.addCase(verify2FA.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.requires2FA = false;
      state.error = null;
    });

    // Fetch current user
    builder.addCase(fetchCurrentUser.fulfilled, (state, action) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    });
  },
});

export const { setUser, updateAgentState, clearError } = authSlice.actions;
export default authSlice.reducer;
