export type BodyType = 'tent' | 'ref' | 'isotherm' | 'flatbed' | 'container' | 'tank';
export type OrderStatus = 'new' | 'assigned' | 'loading' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';
export type VehicleStatus = 'free' | 'in_transit' | 'maintenance';
export type DriverStatus = 'available' | 'on_route' | 'vacation' | 'sick';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type UserRole = 'dispatcher' | 'logist' | 'director';

export interface Client {
  id: number; name: string; inn: string; contact_person: string; phone: string; email: string; address: string; contract_number: string; discount_percent: number; orders_count?: number; total_revenue?: number; created_at: string;
}
export interface Driver {
  id: number; full_name: string; phone: string; license_number: string; license_categories: string; medical_cert_until: string; experience_years: number; status: DriverStatus; rating: number; completed_trips?: number; active_order_number?: string | null;
}
export interface Vehicle {
  id: number; plate_number: string; brand_model: string; body_type: BodyType; capacity_tons: number; volume_m3: number; fuel_consumption: number; mileage_km: number; next_service_km: number; year: number; status: VehicleStatus; active_order_number?: string | null;
}
export interface Order {
  id: number; order_number: string; client_id: number; client_name?: string; client_phone?: string; client_inn?: string; client_address?: string; client_contact?: string; client_contract?: string; client_discount?: number;
  vehicle_id: number | null; plate_number?: string | null; brand_model?: string | null; vehicle_body_type?: BodyType | null; vehicle_capacity?: number | null; vehicle_volume?: number | null;
  driver_id: number | null; driver_name?: string | null; driver_phone?: string | null; driver_license?: string | null;
  cargo_name: string; cargo_category: string; weight_tons: number; volume_m3: number; body_type_required: BodyType;
  origin_city: string; origin_address: string; destination_city: string; destination_address: string; distance_km: number;
  planned_departure: string; planned_arrival: string; actual_arrival: string | null; status: OrderStatus; progress_percent: number;
  base_cost: number; additional_services_cost: number; total_cost: number; fuel_cost_est: number; margin_est: number;
  payment_status: PaymentStatus; is_urgent: number; is_adr: number; has_insurance: number; notes: string;
  pod_signer?: string | null; pod_signature?: string | null; pod_timestamp?: string | null; pod_seal_ok?: number;
  created_at: string; events?: OrderEvent[]; fuelExpenses?: FuelExpense[];
}
export interface SpotLot {
  id: string; code: string; shipper: string; shipperRating: number; origin_city: string; destination_city: string; distance_km: number; cargo_name: string; weight_tons: number; volume_m3: number; body_type_required: BodyType; start_price: number; current_bid: number; bids_count: number; expires_in_min: number; is_urgent: boolean; is_adr: boolean; taken?: boolean;
}
export interface OrderEvent { id: number; order_id: number; status: OrderStatus; location: string; comment: string; created_at: string; }
export interface MaintenanceLog { id: number; vehicle_id: number; plate_number?: string; brand_model?: string; service_date: string; service_type: string; description: string; cost: number; mileage_at_service: number; status: 'scheduled' | 'in_progress' | 'done'; }
export interface FuelExpense { id: number; order_id: number | null; order_number?: string | null; vehicle_id: number; plate_number?: string; brand_model?: string; liters: number; price_per_liter: number; total_amount: number; station: string; recorded_at: string; }
export interface TariffCalculation { baseRatePerKm: number; baseCost: number; urgentFee: number; adrFee: number; loadingFee: number; insuranceFee: number; additionalServicesCost: number; discountAmount: number; discountPercent: number; totalCost: number; fuelLitersEst: number; fuelCostEst: number; driverPayEst: number; marginEst: number; marginPercent: number; }
export interface DashboardData {
  kpis: { totalRevenue: number; paidRevenue: number; totalMargin: number; marginPercent: number; activeTripsCount: number; newOrdersCount: number; completedCount: number; totalOrders: number; totalDistance: number; fleetUtilization: number; totalVehicles: number; busyVehicles: number; maintVehicles: number; availableDrivers: number; totalDrivers: number; maintCostTotal: number; fuelCostTotal: number; };
  monthlyDynamics: Array<{ month: string; revenue: number; expenses: number; profit: number; trips: number }>;
  statusCounts: Array<{ status: string; name: string; count: number }>;
  topClients: Array<{ name: string; orders: number; revenue: number }>;
  activeTrips: Order[]; serviceAlerts: Vehicle[];
}

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  tent: 'Тентованный (еврофура)', ref: 'Рефрижератор', isotherm: 'Изотермический фургон', flatbed: 'Бортовой / открытый', container: 'Контейнеровоз', tank: 'Автоцистерна',
};
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; badgeClass: string; dotClass: string }> = {
  new: { label: 'Новая заявка', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200', dotClass: 'bg-sky-500' },
  assigned: { label: 'Назначен рейс', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200', dotClass: 'bg-indigo-500' },
  loading: { label: 'Погрузка', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', dotClass: 'bg-amber-500' },
  in_transit: { label: 'В пути', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', dotClass: 'bg-blue-600' },
  delivered: { label: 'Доставлен', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200', dotClass: 'bg-teal-500' },
  completed: { label: 'Завершён', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClass: 'bg-emerald-500' },
  cancelled: { label: 'Отменён', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', dotClass: 'bg-rose-500' },
};
export const VEHICLE_STATUS_META: Record<VehicleStatus, { label: string; badgeClass: string }> = {
  free: { label: 'Свободен', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  in_transit: { label: 'В рейсе', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  maintenance: { label: 'На ТО / ремонте', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
};
export const DRIVER_STATUS_META: Record<DriverStatus, { label: string; badgeClass: string }> = {
  available: { label: 'Свободен', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  on_route: { label: 'На маршруте', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  vacation: { label: 'Отпуск', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  sick: { label: 'Больничный', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
};
export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; badgeClass: string }> = {
  unpaid: { label: 'Не оплачен', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  partial: { label: 'Предоплата', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid: { label: 'Оплачен', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};
export const CITY_GEO: Record<string, { lat: number; lng: number; region: string }> = {
  Брест: { lat: 52.0976, lng: 23.7341, region: 'РБ (Брестская обл.)' },
  Гродно: { lat: 53.6884, lng: 23.8258, region: 'РБ (Гродненская обл.)' },
  Минск: { lat: 53.9006, lng: 27.559, region: 'РБ (Минская обл.)' },
  Гомель: { lat: 52.4345, lng: 30.9754, region: 'РБ (Гомельская обл.)' },
  Могилёв: { lat: 53.9168, lng: 30.3449, region: 'РБ (Могилёвская обл.)' },
  Витебск: { lat: 55.1904, lng: 30.2049, region: 'РБ (Витебская обл.)' },
  Смоленск: { lat: 54.7818, lng: 32.0401, region: 'РФ (ЦФО)' },
  'Санкт-Петербург': { lat: 59.9343, lng: 30.3351, region: 'РФ (СЗФО)' },
  Москва: { lat: 55.7558, lng: 37.6173, region: 'РФ (ЦФО)' },
  Воронеж: { lat: 51.6608, lng: 39.2003, region: 'РФ (ЦФО)' },
  'Ростов-на-Дону': { lat: 47.2357, lng: 39.7015, region: 'РФ (ЮФО)' },
  Краснодар: { lat: 45.0355, lng: 38.9753, region: 'РФ (ЮФО)' },
  'Нижний Новгород': { lat: 56.2965, lng: 43.9361, region: 'РФ (ПФО)' },
  Казань: { lat: 55.7963, lng: 49.1088, region: 'РФ (ПФО)' },
  Екатеринбург: { lat: 56.8389, lng: 60.6057, region: 'РФ (УФО)' },
};
export const CITY_NODES: Record<string, { x: number; y: number; region: string }> = {
  Брест: { x: 85, y: 295, region: 'РБ' }, Гродно: { x: 95, y: 245, region: 'РБ' }, Минск: { x: 155, y: 255, region: 'РБ' },
  Гомель: { x: 205, y: 315, region: 'РБ' }, Могилёв: { x: 205, y: 260, region: 'РБ' }, Витебск: { x: 205, y: 205, region: 'РБ' },
  Смоленск: { x: 245, y: 240, region: 'РФ' }, 'Санкт-Петербург': { x: 280, y: 95, region: 'СЗФО' }, Москва: { x: 355, y: 225, region: 'ЦФО' },
  Воронеж: { x: 375, y: 335, region: 'ЦФО' }, 'Ростов-на-Дону': { x: 385, y: 425, region: 'ЮФО' }, Краснодар: { x: 355, y: 468, region: 'ЮФО' },
  'Нижний Новгород': { x: 485, y: 215, region: 'ПФО' }, Казань: { x: 590, y: 225, region: 'ПФО' }, Екатеринбург: { x: 785, y: 205, region: 'УФО' },
};
export const POPULAR_CITIES = Object.keys(CITY_NODES);
export function estimateDistanceKm(from: string, to: string): number {
  const pairKey = [from.trim(), to.trim()].sort().join('|');
  const known: Record<string, number> = {
    'Минск|Москва': 718, 'Москва|Санкт-Петербург': 705, 'Брест|Москва': 1060, 'Москва|Нижний Новгород': 425,
    'Казань|Москва': 825, 'Екатеринбург|Казань': 965, 'Екатеринбург|Москва': 1790, 'Воронеж|Краснодар': 830,
    'Краснодар|Москва': 1350, 'Казань|Ростов-на-Дону': 1410, 'Минск|Смоленск': 330, 'Нижний Новгород|Санкт-Петербург': 1090,
    'Екатеринбург|Нижний Новгород': 1290, 'Воронеж|Москва': 520, 'Москва|Ростов-на-Дону': 1075,
  };
  if (known[pairKey]) return known[pairKey];
  const a = CITY_NODES[from]; const b = CITY_NODES[to];
  if (a && b) return Math.max(120, Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 4.2));
  return 650;
}
export function formatMoney(val: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val || 0);
}
export function formatNumber(val: number): string {
  return new Intl.NumberFormat('ru-RU').format(val || 0);
}
