/**
 * Notification Service - NGS&O CRM
 * Maneja notificaciones de sonido y visuales para mensajes nuevos
 * Desarrollado por: Alejandro Sandoval - AS Software
 */

class NotificationService {
  private audio: HTMLAudioElement | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.7;

  constructor() {
    this.initAudio();
    this.loadPreferences();
  }

  /**
   * Inicializar audio
   */
  private initAudio(): void {
    try {
      // Crear elemento de audio para notificaciones
      this.audio = new Audio('/sounds/notification.mp3');
      this.audio.volume = this.volume;
      
      // Manejar error si el archivo no existe - usar beep generado
      this.audio.addEventListener('error', () => {
        console.warn('No se pudo cargar notification.mp3, usando beep generado');
        this.audio = null;
      });
      
      // Precargar el audio
      this.audio.load();
    } catch (error) {
      console.error('Error al inicializar audio de notificaciones:', error);
    }
  }

  /**
   * Generar beep simple usando Web Audio API (fallback)
   */
  private playBeep(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar tono
      oscillator.frequency.value = 800; // Frecuencia en Hz
      oscillator.type = 'sine'; // Tipo de onda

      // Configurar volumen con fade out
      gainNode.gain.setValueAtTime(this.volume * 0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      // Reproducir
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Error al generar beep:', error);
    }
  }

  /**
   * Cargar preferencias del usuario desde localStorage
   */
  private loadPreferences(): void {
    try {
      const enabled = localStorage.getItem('notifications_enabled');
      const volume = localStorage.getItem('notifications_volume');

      if (enabled !== null) {
        this.isEnabled = enabled === 'true';
      }

      if (volume !== null) {
        this.volume = parseFloat(volume);
        if (this.audio) {
          this.audio.volume = this.volume;
        }
      }
    } catch (error) {
      console.error('Error al cargar preferencias de notificaciones:', error);
    }
  }

  /**
   * Guardar preferencias
   */
  private savePreferences(): void {
    try {
      localStorage.setItem('notifications_enabled', this.isEnabled.toString());
      localStorage.setItem('notifications_volume', this.volume.toString());
    } catch (error) {
      console.error('Error al guardar preferencias de notificaciones:', error);
    }
  }

  /**
   * Reproducir sonido de notificación
   */
  public playNotificationSound(): void {
    if (!this.isEnabled) {
      return;
    }

    try {
      if (this.audio) {
        // Resetear audio si ya se está reproduciendo
        this.audio.currentTime = 0;
        
        // Reproducir
        const playPromise = this.audio.play();
        
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn('No se pudo reproducir el sonido de notificación, usando beep:', error);
            // Fallback a beep generado
            this.playBeep();
          });
        }
      } else {
        // Si no hay archivo de audio, usar beep generado
        this.playBeep();
      }
    } catch (error) {
      console.error('Error al reproducir sonido de notificación:', error);
      // Intentar beep como último recurso
      try {
        this.playBeep();
      } catch (beepError) {
        console.error('Error al reproducir beep:', beepError);
      }
    }
  }

  /**
   * Mostrar notificación del navegador (requiere permiso)
   */
  public async showBrowserNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    // Verificar si las notificaciones están soportadas
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones de escritorio');
      return;
    }

    // Solicitar permiso si no se ha concedido
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // Mostrar notificación si hay permiso
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/logo.png',
          badge: '/logo.png',
          ...options,
        });
      } catch (error) {
        console.error('Error al mostrar notificación del navegador:', error);
      }
    }
  }

  /**
   * Notificación completa (sonido + visual)
   */
  public async notify(title: string, options?: NotificationOptions): Promise<void> {
    this.playNotificationSound();
    await this.showBrowserNotification(title, options);
  }

  /**
   * Notificación para mensaje nuevo
   */
  public async notifyNewMessage(clientPhone: string, content: string): Promise<void> {
    await this.notify('Nuevo mensaje recibido', {
      body: `${clientPhone}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      tag: 'new-message',
      requireInteraction: false,
    });
  }

  /**
   * Notificación para chat asignado
   */
  public async notifyChatAssigned(clientPhone: string): Promise<void> {
    await this.notify('Chat asignado', {
      body: `Se te ha asignado un nuevo chat: ${clientPhone}`,
      tag: 'chat-assigned',
      requireInteraction: true,
    });
  }

  /**
   * Habilitar/deshabilitar notificaciones
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.savePreferences();
  }

  /**
   * Verificar si las notificaciones están habilitadas
   */
  public isNotificationsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Establecer volumen (0.0 - 1.0)
   */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
    this.savePreferences();
  }

  /**
   * Obtener volumen actual
   */
  public getVolume(): number {
    return this.volume;
  }

  /**
   * Solicitar permisos de notificaciones del navegador
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones de escritorio');
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  /**
   * Probar notificación
   */
  public testNotification(): void {
    this.playNotificationSound();
    this.showBrowserNotification('Notificación de prueba', {
      body: 'Si puedes ver y escuchar esto, las notificaciones están funcionando correctamente',
      tag: 'test-notification',
    });
  }
}

// Exportar instancia única (singleton)
export const notificationService = new NotificationService();
export default notificationService;
