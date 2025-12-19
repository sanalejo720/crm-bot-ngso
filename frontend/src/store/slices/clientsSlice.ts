// Clients Slice - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Client, CollectionStatus } from '../../types/index';
import apiService from '../../services/api';

interface ClientsState {
  items: Client[];
  selectedClient: Client | null;
  total: number;
  isLoading: boolean;
  error: string | null;
  filters: {
    collectionStatus?: CollectionStatus;
    minDaysOverdue?: number;
    search?: string;
  };
}

const initialState: ClientsState = {
  items: [],
  selectedClient: null,
  total: 0,
  isLoading: false,
  error: null,
  filters: {},
};

// Async thunks
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (filters: ClientsState['filters'] = {}, { rejectWithValue }) => {
    try {
      const response = await apiService.get('/clients', { params: filters });
      const result = response.data || response;
      const data = result.data || result;
      return Array.isArray(data) ? { data, total: data.length } : data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error obteniendo clientes');
    }
  }
);

export const fetchClientById = createAsyncThunk(
  'clients/fetchClientById',
  async (clientId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/clients/${clientId}`);
      const result = response.data || response;
      return result.data || result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error obteniendo cliente');
    }
  }
);

export const updateClientStatus = createAsyncThunk(
  'clients/updateClientStatus',
  async (
    { clientId, collectionStatus }: { clientId: string; collectionStatus: CollectionStatus },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.patch(`/clients/${clientId}`, {
        collectionStatus,
      });
      const result = response.data || response;
      return result.data || result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error actualizando estado');
    }
  }
);

export const setPromisePayment = createAsyncThunk(
  'clients/setPromisePayment',
  async (
    { clientId, promiseDate, promiseAmount }: { 
      clientId: string; 
      promiseDate: string; 
      promiseAmount: number 
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.patch(`/clients/${clientId}`, {
        promisePaymentDate: promiseDate,
        promisePaymentAmount: promiseAmount,
        collectionStatus: 'promise',
      });
      const result = response.data || response;
      return result.data || result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error registrando promesa');
    }
  }
);

export const updateClientData = createAsyncThunk(
  'clients/updateClientData',
  async (
    { clientId, data }: { 
      clientId: string; 
      data: Partial<Client>;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.patch(`/clients/${clientId}`, data);
      const result = response.data || response;
      return result.data || result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error actualizando cliente');
    }
  }
);

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    setSelectedClient: (state, action: PayloadAction<Client | null>) => {
      state.selectedClient = action.payload;
    },
    updateClient: (state, action: PayloadAction<Client>) => {
      const index = state.items.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      
      if (state.selectedClient?.id === action.payload.id) {
        state.selectedClient = action.payload;
      }
    },
    setFilters: (state, action: PayloadAction<ClientsState['filters']>) => {
      state.filters = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch clients
    builder.addCase(fetchClients.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchClients.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items = action.payload.data;
      state.total = action.payload.total;
    });
    builder.addCase(fetchClients.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch client by ID
    builder.addCase(fetchClientById.fulfilled, (state, action) => {
      state.selectedClient = action.payload;
    });

    // Update client status
    builder.addCase(updateClientStatus.fulfilled, (state, action) => {
      const index = state.items.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.selectedClient?.id === action.payload.id) {
        state.selectedClient = action.payload;
      }
    });

    // Set promise payment
    builder.addCase(setPromisePayment.fulfilled, (state, action) => {
      const index = state.items.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.selectedClient?.id === action.payload.id) {
        state.selectedClient = action.payload;
      }
    });

    // Update client data
    builder.addCase(updateClientData.fulfilled, (state, action) => {
      const index = state.items.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.selectedClient?.id === action.payload.id) {
        state.selectedClient = action.payload;
      }
    });
  },
});

export const {
  setSelectedClient,
  updateClient,
  setFilters,
  clearError,
} = clientsSlice.actions;

export default clientsSlice.reducer;
