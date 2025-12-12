/**
 * Utilidades para normalización de números de teléfono
 */

/**
 * Normaliza un número de teléfono de WhatsApp
 * Elimina sufijos como @c.us, @g.us, @s.whatsapp.net
 * NOTA: Preserva @lid ya que es el nuevo formato de WhatsApp y se necesita completo para enviar mensajes
 * 
 * @param phone - Número de teléfono en formato WhatsApp
 * @returns Número normalizado (ej: "573001234567" o "197345677467838@lid")
 */
export function normalizeWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  
  // Si es formato @lid (nuevo formato de WhatsApp), preservar completo
  // Los LID son identificadores internos de WhatsApp que reemplazan gradualmente a @c.us
  if (phone.includes('@lid')) {
    // Retornar el LID completo, es necesario para enviar mensajes
    return phone.trim();
  }
  
  // Eliminar sufijos de WhatsApp tradicionales
  let normalized = phone.replace(/@c\.us|@g\.us|@s\.whatsapp\.net/gi, '');
  
  // Eliminar espacios, guiones y paréntesis
  normalized = normalized.replace(/[\s\-\(\)]/g, '');
  
  // Asegurar que solo queden números y opcionalmente el +
  normalized = normalized.replace(/[^\d+]/g, '');
  
  return normalized;
}

/**
 * Formatea un número de teléfono para mostrar de manera legible
 * 
 * @param phone - Número de teléfono normalizado
 * @returns Número formateado para mostrar
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  const normalized = normalizeWhatsAppPhone(phone);
  
  // Si es número colombiano (57 + 10 dígitos)
  if (normalized.startsWith('57') && normalized.length === 12) {
    const country = normalized.substring(0, 2);
    const area = normalized.substring(2, 5);
    const part1 = normalized.substring(5, 8);
    const part2 = normalized.substring(8, 12);
    return `+${country} ${area} ${part1} ${part2}`;
  }
  
  // Para otros países, simplemente agregar + si no lo tiene
  if (!normalized.startsWith('+') && normalized.length > 10) {
    return `+${normalized}`;
  }
  
  return normalized;
}

/**
 * Extrae solo los dígitos del número para comparaciones
 * 
 * @param phone - Número de teléfono en cualquier formato
 * @returns Solo los dígitos del número
 */
export function extractPhoneDigits(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}
