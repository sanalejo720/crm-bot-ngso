// Debug utilities - NGS&O CRM Gestión

export const debugAuth = () => {
  console.group('🔍 DEBUG: Autenticación');
  
  const token = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const user = localStorage.getItem('user');
  
  console.log('Token presente:', !!token);
  if (token) {
    console.log('Token (primeros 50 caracteres):', token.substring(0, 50) + '...');
    
    // Decodificar JWT payload
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload:', payload);
      console.log('Token expira:', new Date(payload.exp * 1000));
      console.log('Token expirado:', Date.now() > payload.exp * 1000);
    } catch (e) {
      console.error('Error decodificando token:', e);
    }
  }
  
  console.log('Refresh token presente:', !!refreshToken);
  console.log('Usuario:', user ? JSON.parse(user) : null);
  
  console.groupEnd();
};

export const debugApiCall = (method: string, url: string, response: any) => {
  console.group(`🌐 API: ${method} ${url}`);
  console.log('Response:', response);
  console.log('Response.data:', response.data);
  if (response.data?.data) {
    console.log('Response.data.data:', response.data.data);
  }
  console.groupEnd();
};

// Agregar al window para acceso desde consola del navegador
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
}
