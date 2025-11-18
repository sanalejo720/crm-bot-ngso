import axios from 'axios';

const apiService = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth token
apiService.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url} - Token presente: ${token.substring(0, 20)}...`);
    } else {
      console.warn(`[API] ${config.method?.toUpperCase()} ${config.url} - ⚠️ NO HAY TOKEN`);
    }
    return config;
  },
  (error) => {
    console.error('[API] Error en request interceptor:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle backend format and errors
apiService.interceptors.response.use(
  (response) => {
    // Backend devuelve { success, data, timestamp }
    console.log(`[API] Response ${response.config.url}:`, {
      status: response.status,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : []
    });
    return response;
  },
  (error) => {
    console.error(`[API] Error ${error.config?.url}:`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    
    // Si hay error 401, limpiar localStorage y redirigir al login
    if (error.response?.status === 401) {
      console.warn('[API] 401 Unauthorized - Limpiando sesión y redirigiendo al login');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // Redirigir al login si no estamos ya ahí
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiService;
