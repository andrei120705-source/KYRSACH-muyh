import { Capacitor } from '@capacitor/core';
import type {
  Client,
  DashboardData,
  Driver,
  FuelExpense,
  MaintenanceLog,
  Order,
  TariffCalculation,
  Vehicle,
} from '../types/logistics';
import { localEngine } from './localEngine';

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.protocol === 'file:' || window.location.protocol === 'capacitor:') {
    return true;
  }
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    // ignore
  }
  return false;
}

const forceLocal = detectStandalone();

export function isLocalMode(): boolean {
  return forceLocal;
}

async function withFallback<T>(serverCall: () => Promise<T>, localCall: () => T): Promise<T> {
  if (forceLocal) return localCall();
  try {
    return await serverCall();
  } catch (err) {
    if (err instanceof TypeError || (err instanceof Error && ['AbortError', 'TimeoutError'].includes(err.name))) {
      throw new Error('Нет связи с сервером. Проверьте подключение и повторите запрос.');
    }
    throw err;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    signal: options?.signal ?? AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    let msg = `Ошибка HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  getDashboard: () => withFallback(() => request<DashboardData>('/api/dashboard'), () => localEngine.getDashboard()),
  getOrders: (params?: { status?: string; search?: string }) =>
    withFallback(() => {
      const qs = new URLSearchParams();
      if (params?.status && params.status !== 'all') qs.set('status', params.status);
      if (params?.search) qs.set('search', params.search);
      return request<Order[]>(`/api/orders${qs.toString() ? `?${qs.toString()}` : ''}`);
    }, () => localEngine.getOrders(params)),
  getOrder: (id: number) => withFallback(() => request<Order>(`/api/orders/${id}`), () => localEngine.getOrder(id)),
  createOrder: (payload: Record<string, unknown>) =>
    withFallback(() => request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(payload) }), () => localEngine.createOrder(payload)),
  assignOrder: (id: number, vehicle_id: number, driver_id: number) =>
    withFallback(() => request<Order>(`/api/orders/${id}/assign`, { method: 'POST', body: JSON.stringify({ vehicle_id, driver_id }) }), () => localEngine.assignOrder(id, vehicle_id, driver_id)),
  updateOrderStatus: (id: number, payload: { status: string; location?: string; comment?: string; progress_percent?: number }) =>
    withFallback(() => request<Order>(`/api/orders/${id}/status`, { method: 'POST', body: JSON.stringify(payload) }), () => localEngine.updateOrderStatus(id, payload)),
  saveOrderPod: (id: number, payload: { signer: string; signature: string; seal_ok: boolean }) =>
    withFallback(() => request<Order>(`/api/orders/${id}/pod`, { method: 'POST', body: JSON.stringify(payload) }), () => localEngine.saveOrderPod(id, payload)),
  patchOrder: (id: number, payload: Record<string, unknown>) =>
    withFallback(() => request<Order>(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }), () => localEngine.patchOrder(id, payload)),
  deleteOrder: (id: number) =>
    withFallback(() => request<{ deleted: boolean }>(`/api/orders/${id}`, { method: 'DELETE' }), () => localEngine.deleteOrder(id)),
  calculateTariff: (payload: Record<string, unknown>) =>
    withFallback(() => request<TariffCalculation>('/api/calculate-tariff', { method: 'POST', body: JSON.stringify(payload) }), () => localEngine.calculateTariff(payload)),
  getVehicles: () => withFallback(() => request<Vehicle[]>('/api/vehicles'), () => localEngine.getVehicles()),
  createVehicle: (payload: Record<string, unknown>) =>
    withFallback(() => request<Vehicle>('/api/vehicles', { method: 'POST', body: JSON.stringify(payload) }), () => localEngine.createVehicle(payload)),
  updateVehicle: (id: number, payload: Record<string, unknown>) =>
    withFallback(() => request<Vehicle>(`/api/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }), () => localEngine.updateVehicle(id, payload)),
  deleteVehicle: (id: number) =>
    withFallback(() => request<{ deleted: boolean }>(`/api/vehicles/${id}`, { method: 'DELETE' }), () => localEngine.deleteVehicle(id)),
  getMaintenance: () => withFallback(() => request<MaintenanceLog[]>('/api/maintenance'), () => localEngine.getMaintenance()),
  createMaintenance: (payload: Record<string, unknown>) =>
    withFallback(() => request<MaintenanceLog>('/api/maintenance', { method: 'POST', body: JSON.stringify(payload) }), () => localEngine.createMaintenance(payload)),
  updateMaintenanceStatus: (id: number, status: string) =>
    withFallback(() => request<MaintenanceLog>(`/api/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }), () => localEngine.updateMaintenanceStatus(id, status)),
  getDrivers: () => withFallback(() => request<Driver[]>('/api/drivers'), () => localEngine.getDrivers()),
  createDriver: (payload: Record<string, unknown>) =>
    withFallback(() => request<Driver>('/api/drivers', { method: 'POST', body: JSON.stringify(payload) }), () => localEngine.createDriver(payload)),
  updateDriver: (id: number, payload: Record<string, unknown>) =>
    withFallback(() => request<Driver>(`/api/drivers/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }), () => localEngine.updateDriver(id, payload)),
  deleteDriver: (id: number) =>
    withFallback(() => request<{ deleted: boolean }>(`/api/drivers/${id}`, { method: 'DELETE' }), () => localEngine.deleteDriver(id)),
  getClients: () => withFallback(() => request<Client[]>('/api/clients'), () => localEngine.getClients()),
  createClient: (payload: Record<string, unknown>) =>
    withFallback(() => request<Client>('/api/clients', { method: 'POST', body: JSON.stringify(payload) }), () => localEngine.createClient(payload)),
  updateClient: (id: number, payload: Record<string, unknown>) =>
    withFallback(() => request<Client>(`/api/clients/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }), () => localEngine.updateClient(id, payload)),
  deleteClient: (id: number) =>
    withFallback(() => request<{ deleted: boolean }>(`/api/clients/${id}`, { method: 'DELETE' }), () => localEngine.deleteClient(id)),
  getFuel: () => withFallback(() => request<FuelExpense[]>('/api/fuel'), () => localEngine.getFuel()),
  createFuel: (payload: Record<string, unknown>) =>
    withFallback(() => request<FuelExpense>('/api/fuel', { method: 'POST', body: JSON.stringify(payload) }), () => localEngine.createFuel(payload)),
  resetDemo: () => withFallback(() => request<{ ok: boolean }>('/api/reset-demo', { method: 'POST' }), () => localEngine.resetDemo()),
};

export function exportCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escape = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const csvContent = '\uFEFF' + [headers.map(escape).join(';'), ...rows.map((r) => r.map(escape).join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
