// Utilidades - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import type { Priority, Client } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Calcular prioridad según días de mora
export function calculatePriority(daysOverdue: number): Priority {
  if (daysOverdue > 90) return 'URGENTE';
  if (daysOverdue > 30) return 'ALTA';
  if (daysOverdue > 15) return 'MEDIA';
  return 'BAJA';
}

// Color por prioridad
export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'URGENTE':
      return '#d32f2f'; // Rojo
    case 'ALTA':
      return '#f57c00'; // Naranja
    case 'MEDIA':
      return '#fbc02d'; // Amarillo
    case 'BAJA':
      return '#388e3c'; // Verde
    default:
      return '#757575'; // Gris
  }
}

// Color por estado de cobranza
export function getCollectionStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#9e9e9e'; // Gris
    case 'contacted':
      return '#2196f3'; // Azul
    case 'promise':
      return '#ff9800'; // Naranja
    case 'paid':
      return '#4caf50'; // Verde
    case 'legal':
      return '#f44336'; // Rojo
    case 'unlocatable':
      return '#795548'; // Café
    default:
      return '#757575';
  }
}

// Etiqueta de estado de cobranza
export function getCollectionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    contacted: 'Contactado',
    promise: 'Promesa',
    paid: 'Pagado',
    legal: 'Legal',
    unlocatable: 'No Ubicable',
  };
  return labels[status] || status;
}

// Formatear moneda
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Formatear fecha
export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
}

// Formatear fecha relativa ("hace 2 horas")
export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return 'Sin fecha';
  
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return 'Fecha inválida';
  }
  
  return formatDistanceToNow(parsedDate, { addSuffix: true, locale: es });
}

// Formatear solo fecha (sin hora)
export function formatDateOnly(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: es });
}

// Formatear solo hora
export function formatTimeOnly(date: string | Date): string {
  return format(new Date(date), 'HH:mm', { locale: es });
}

// Obtener iniciales del nombre
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Validar email
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Validar teléfono colombiano
export function isValidPhone(phone: string): boolean {
  const regex = /^(\+57)?3\d{9}$/;
  return regex.test(phone.replace(/\s/g, ''));
}

// Formatear teléfono
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
}

// Truncar texto
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Obtener prioridad de cliente
export function getClientPriority(client: Client): Priority {
  return calculatePriority(client.daysOverdue);
}

// Verificar si fecha está vencida
export function isOverdue(date: string | Date): boolean {
  return new Date(date) < new Date();
}

// Días hasta fecha
export function daysUntil(date: string | Date): number {
  const diff = new Date(date).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
