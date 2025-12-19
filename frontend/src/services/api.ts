import axios from 'axios';

const apiService = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag para evitar múltiples intentos de refresh simultáneos
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Add request interceptor for auth token
apiService.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API] Error en request interceptor:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh and errors
apiService.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Si hay error 401 y no es un retry, intentar refrescar el token
    if (error.response?.status === 401 && !originalRequest._retry) {
      // No intentar refresh si es la llamada de refresh o login
      if (originalRequest.url?.includes('/auth/refresh') || 
          originalRequest.url?.includes('/auth/login')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Si ya estamos refrescando, encolar esta petición
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiService(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        console.warn('[API] No hay refresh token - Cerrando sesión');
        isRefreshing = false;
        clearSessionAndRedirect();
        return Promise.reject(error);
      }

      try {
        console.log('[API] Token expirado - Intentando refrescar...');
        const response = await axios.post(
          `${apiService.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        );

        const newAccessToken = response.data?.data?.accessToken || response.data?.accessToken;
        
        if (newAccessToken) {
          console.log('[API] ✅ Token refrescado exitosamente');
          localStorage.setItem('accessToken', newAccessToken);
          
          // Actualizar refresh token si viene uno nuevo
          const newRefreshToken = response.data?.data?.refreshToken || response.data?.refreshToken;
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          
          apiService.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          processQueue(null, newAccessToken);
          
          return apiService(originalRequest);
        } else {
          throw new Error('No access token in refresh response');
        }
      } catch (refreshError) {
        console.error('[API] ❌ Error al refrescar token:', refreshError);
        processQueue(refreshError as Error, null);
        clearSessionAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

function clearSessionAndRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export default apiService;
