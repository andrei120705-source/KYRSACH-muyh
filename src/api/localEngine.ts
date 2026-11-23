import type { BodyType, Client, DashboardData, Driver, FuelExpense, MaintenanceLog, Order, OrderEvent, OrderStatus, TariffCalculation, Vehicle } from '../types/logistics';
const STORAGE_KEY = 'translogist_ais_db_v1';
interface LocalDB { clients: Client[]; drivers: Driver[]; vehicles: Vehicle[]; orders: Order[]; events: OrderEvent[]; maintenance: MaintenanceLog[]; fuel: FuelExpense[]; }
const TARIFFS: Record<BodyType, { baseRatePerKm: number; minCost: number; fuelRatePer100Km: number }> = {
  tent: { baseRatePerKm: 78, minCost: 18000, fuelRatePer100Km: 32 }, ref: { baseRatePerKm: 98, minCost: 24000, fuelRatePer100Km: 36 },
  isotherm: { baseRatePerKm: 86, minCost: 20000, fuelRatePer100Km: 31 }, flatbed: { baseRatePerKm: 82, minCost: 19000, fuelRatePer100Km: 33 },
  container: { baseRatePerKm: 92, minCost: 22000, fuelRatePer100Km: 35 }, tank: { baseRatePerKm: 112, minCost: 28000, fuelRatePer100Km: 38 },
};
const STATUS_PROGRESS: Record<OrderStatus, number> = { new: 0, assigned: 10, loading: 25, in_transit: 60, delivered: 90, completed: 100, cancelled: 0 };

export function calculateTariffLocal(params: { bodyType?: BodyType; distanceKm?: number; weightTons?: number; isUrgent?: boolean; isAdr?: boolean; hasInsurance?: boolean; loadingHours?: number; discountPercent?: number }): TariffCalculation {
  const tariff = TARIFFS[params.bodyType || 'tent'] || TARIFFS.tent;
  const dist = Math.max(1, Number(params.distanceKm) || 0), weight = Math.max(0.1, Number(params.weightTons) || 0), hours = Math.max(0, Number(params.loadingHours) || 0), discount = Math.min(30, Math.max(0, Number(params.discountPercent) || 0));
  const baseCost = Math.round(Math.max(tariff.minCost, dist * tariff.baseRatePerKm * (weight > 15 ? 1.12 : weight > 8 ? 1.05 : 1)));
  const urgentFee = params.isUrgent ? Math.round(baseCost * 0.18) : 0, adrFee = params.isAdr ? Math.round(baseCost * 0.22) : 0, loadingFee = Math.round(hours * 1800);
  const insuranceFee = params.hasInsurance ? Math.round((baseCost + urgentFee + adrFee) * 0.03) : 0;
  const additionalServicesCost = urgentFee + adrFee + loadingFee + insuranceFee, subtotal = baseCost + additionalServicesCost, discountAmount = Math.round(subtotal * (discount / 100));
  const totalCost = Math.max(tariff.minCost, subtotal - discountAmount), fuelLitersEst = Math.round((dist / 100) * tariff.fuelRatePer100Km * 10) / 10, fuelCostEst = Math.round(fuelLitersEst * 67.5);
  const driverPayEst = Math.round(dist * 14 + 3500), marginEst = totalCost - fuelCostEst - driverPayEst - Math.round(dist * 6);
  return { baseRatePerKm: tariff.baseRatePerKm, baseCost, urgentFee, adrFee, loadingFee, insuranceFee, additionalServicesCost, discountAmount, discountPercent: discount, totalCost, fuelLitersEst, fuelCostEst, driverPayEst, marginEst, marginPercent: totalCost > 0 ? Math.round((marginEst / totalCost) * 1000) / 10 : 0 };
}

function buildSeedDB(): LocalDB {
  const clients: Client[] = [
    { id: 1, name: 'ООО «ТехноПромСнаб»', inn: '7704829104', contact_person: 'Соколов Андрей Викторович', phone: '+7 (495) 741-22-18', email: 'logistics@tehnoprom.ru', address: 'г. Москва, ул. Рябиновая, 45', contract_number: 'ДГ-2026/014', discount_percent: 5, created_at: '2026-08-01' },
    { id: 2, name: 'АО «БелАгроМаркет»', inn: '5029184720', contact_person: 'Ковалёва Ирина Сергеевна', phone: '+375 (29) 612-88-40', email: 'supply@belagro.ru', address: 'г. Минск, пр-т Партизанский, 112', contract_number: 'ДГ-2026/029', discount_percent: 7, created_at: '2026-08-05' },
    { id: 3, name: 'ООО «СеверСтальКомплект»', inn: '7810394811', contact_person: 'Морозов Дмитрий Олегович', phone: '+7 (812) 409-15-90', email: 'd.morozov@severkomplekt.ru', address: 'г. Санкт-Петербург, Московское ш., 70', contract_number: 'ДГ-2026/041', discount_percent: 3, created_at: '2026-08-12' },
    { id: 4, name: 'ООО «ФармЛогистика Плюс»', inn: '7728910345', contact_person: 'Захарова Елена Павловна', phone: '+7 (495) 980-44-12', email: 'zakaz@pharmlog.ru', address: 'г. Подольск, ул. Плещеевская, 18', contract_number: 'ДГ-2026/053', discount_percent: 10, created_at: '2026-09-01' },
    { id: 5, name: 'ПАО «ВолгаХимПродукт»', inn: '1655290184', contact_person: 'Галимов Рустам Ильдарович', phone: '+7 (843) 225-60-77', email: 'cargo@volgahim.ru', address: 'г. Казань, ул. Химическая, 29', contract_number: 'ДГ-2026/068', discount_percent: 5, created_at: '2026-09-10' },
  ];
  const drivers: Driver[] = [
    { id: 1, full_name: 'Петров Алексей Иванович', phone: '+7 (916) 442-19-83', license_number: '77 24 891042', license_categories: 'B, C, CE', medical_cert_until: '2027-08-15', experience_years: 12, status: 'on_route', rating: 4.95 },
    { id: 2, full_name: 'Смирнов Виктор Николаевич', phone: '+7 (926) 715-30-41', license_number: '50 22 654318', license_categories: 'C, CE', medical_cert_until: '2027-04-20', experience_years: 9, status: 'on_route', rating: 4.88 },
    { id: 3, full_name: 'Волков Денис Сергеевич', phone: '+7 (921) 804-55-27', license_number: '78 21 774209', license_categories: 'C, CE, ADR', medical_cert_until: '2027-12-10', experience_years: 8, status: 'available', rating: 4.84 },
    { id: 4, full_name: 'Новиков Артём Олегович', phone: '+7 (910) 338-72-90', license_number: '67 23 440192', license_categories: 'C, CE', medical_cert_until: '2027-06-05', experience_years: 6, status: 'available', rating: 4.79 },
    { id: 5, full_name: 'Фёдоров Игорь Владимирович', phone: '+7 (917) 992-48-15', license_number: '16 24 308751', license_categories: 'B, C, CE, ADR', medical_cert_until: '2027-09-12', experience_years: 11, status: 'available', rating: 4.96 },
  ];
  const vehicles: Vehicle[] = [
    { id: 1, plate_number: 'А742МР 799', brand_model: 'Volvo FH 460 + Schmitz', body_type: 'tent', capacity_tons: 20, volume_m3: 92, fuel_consumption: 31.5, mileage_km: 184200, next_service_km: 195000, year: 2023, status: 'in_transit' },
    { id: 2, plate_number: 'К318ОВ 797', brand_model: 'Scania R450 + Krone Cool', body_type: 'ref', capacity_tons: 20, volume_m3: 86, fuel_consumption: 35.8, mileage_km: 142800, next_service_km: 150000, year: 2023, status: 'in_transit' },
    { id: 3, plate_number: 'Е112АК 198', brand_model: 'MAN TGX 18.480', body_type: 'container', capacity_tons: 24, volume_m3: 68, fuel_consumption: 34.2, mileage_km: 209300, next_service_km: 210000, year: 2022, status: 'free' },
    { id: 4, plate_number: 'В584РС 799', brand_model: 'Mercedes-Benz Actros 1845', body_type: 'isotherm', capacity_tons: 15, volume_m3: 64, fuel_consumption: 29.8, mileage_km: 96400, next_service_km: 115000, year: 2024, status: 'free' },
    { id: 5, plate_number: 'О229ХЕ 116', brand_model: 'DAF XF 480 + Цистерна', body_type: 'tank', capacity_tons: 22, volume_m3: 34, fuel_consumption: 37.5, mileage_km: 163000, next_service_km: 175000, year: 2022, status: 'free' },
    { id: 6, plate_number: 'Н403КМ 799', brand_model: 'Isuzu Giga 6x4', body_type: 'isotherm', capacity_tons: 12, volume_m3: 52, fuel_consumption: 26.5, mileage_km: 241500, next_service_km: 240000, year: 2021, status: 'maintenance' },
  ];
  const mkOrder = (o: Omit<Order, 'base_cost' | 'additional_services_cost' | 'total_cost' | 'fuel_cost_est' | 'margin_est'>): Order => {
    const c = clients.find((x) => x.id === o.client_id);
    const calc = calculateTariffLocal({ bodyType: o.body_type_required, distanceKm: o.distance_km, weightTons: o.weight_tons, isUrgent: Boolean(o.is_urgent), isAdr: Boolean(o.is_adr), hasInsurance: Boolean(o.has_insurance), loadingHours: 2, discountPercent: c?.discount_percent || 0 });
    return { ...o, base_cost: calc.baseCost, additional_services_cost: calc.additionalServicesCost, total_cost: calc.totalCost, fuel_cost_est: calc.fuelCostEst, margin_est: calc.marginEst };
  };
  const orders: Order[] = [
    mkOrder({ id: 1, order_number: 'ТР-2026-101', client_id: 1, vehicle_id: 1, driver_id: 1, cargo_name: 'Промышленное электрооборудование (24 паллеты)', cargo_category: 'Оборудование', weight_tons: 16.4, volume_m3: 74, body_type_required: 'tent', origin_city: 'Москва', origin_address: 'Рябиновая ул., 45', destination_city: 'Минск', destination_address: 'ул. Селицкого, 21', distance_km: 718, planned_departure: '2026-11-22 08:00', planned_arrival: '2026-11-24 14:00', actual_arrival: null, status: 'in_transit', progress_percent: 68, payment_status: 'partial', is_urgent: 0, is_adr: 0, has_insurance: 1, notes: 'Вариант: по платным дорогам', created_at: '2026-11-21 11:20:00' }),
    mkOrder({ id: 2, order_number: 'ТР-2026-102', client_id: 4, vehicle_id: 2, driver_id: 2, cargo_name: 'Фармацевтические препараты (+2..+8 °C)', cargo_category: 'Температурный груз', weight_tons: 11.2, volume_m3: 54, body_type_required: 'ref', origin_city: 'Москва', origin_address: 'Подольск, ул. Плещеевская, 18', destination_city: 'Санкт-Петербург', destination_address: 'Шушары, пр-д 6', distance_km: 684, planned_departure: '2026-11-22 06:30', planned_arrival: '2026-11-24 18:00', actual_arrival: null, status: 'in_transit', progress_percent: 52, payment_status: 'paid', is_urgent: 1, is_adr: 0, has_insurance: 1, notes: 'Вариант: по платным дорогам (М-11)', created_at: '2026-11-21 09:15:00' }),
    mkOrder({ id: 3, order_number: 'ТР-2026-103', client_id: 5, vehicle_id: null, driver_id: null, cargo_name: 'Промышленные растворители (ADR класс 3)', cargo_category: 'Опасный груз (ADR)', weight_tons: 18.0, volume_m3: 28, body_type_required: 'tank', origin_city: 'Казань', origin_address: 'ул. Химическая, 29', destination_city: 'Москва', destination_address: 'Люберцы, ул. Транспортная, 12', distance_km: 825, planned_departure: '2026-11-25 07:00', planned_arrival: '2026-11-26 20:00', actual_arrival: null, status: 'new', progress_percent: 0, payment_status: 'unpaid', is_urgent: 1, is_adr: 1, has_insurance: 1, notes: 'Требуется допуск ADR', created_at: '2026-11-22 17:45:00' }),
    mkOrder({ id: 4, order_number: 'ТР-2026-098', client_id: 2, vehicle_id: 3, driver_id: 4, cargo_name: 'Молочная продукция и сыры (+4 °C)', cargo_category: 'Продукты питания', weight_tons: 14.0, volume_m3: 60, body_type_required: 'ref', origin_city: 'Минск', origin_address: 'пр-т Партизанский, 112', destination_city: 'Гомель', destination_address: 'ул. Советская, 80', distance_km: 312, planned_departure: '2026-11-10 08:00', planned_arrival: '2026-11-10 16:00', actual_arrival: '2026-11-10 15:10', status: 'completed', progress_percent: 100, payment_status: 'paid', is_urgent: 0, is_adr: 0, has_insurance: 1, notes: 'Вариант: по платным дорогам (BelToll М-5)', created_at: '2026-11-09 14:00:00' }),
    mkOrder({ id: 5, order_number: 'ТР-2026-095', client_id: 3, vehicle_id: 1, driver_id: 1, cargo_name: 'Металлопрокат и профиль', cargo_category: 'Металлопродукция', weight_tons: 19.2, volume_m3: 48, body_type_required: 'tent', origin_city: 'Санкт-Петербург', origin_address: 'Московское ш., 70', destination_city: 'Нижний Новгород', destination_address: 'ул. Кузбасская, 17А', distance_km: 1090, planned_departure: '2026-10-18 09:00', planned_arrival: '2026-10-20 18:00', actual_arrival: '2026-10-20 17:20', status: 'completed', progress_percent: 100, payment_status: 'paid', is_urgent: 0, is_adr: 0, has_insurance: 0, notes: 'Вариант: по бесплатным дорогам', created_at: '2026-10-17 12:00:00' }),
  ];
  const events: OrderEvent[] = [
    { id: 1, order_id: 1, status: 'in_transit', location: 'Смоленск (М-1)', comment: 'Движение по графику', created_at: '2026-11-23 12:10:00' },
    { id: 2, order_id: 2, status: 'in_transit', location: 'Тверь (М-11)', comment: 'Температура в кузове +4.2 °C', created_at: '2026-11-23 14:20:00' },
  ];
  const maintenance: MaintenanceLog[] = [
    { id: 1, vehicle_id: 6, service_date: '2026-11-20', service_type: 'Капитальный ремонт КПП и ТО-3', description: 'Замена сцепления, диагностика тормозов', cost: 148500, mileage_at_service: 241500, status: 'in_progress' },
    { id: 2, vehicle_id: 3, service_date: '2026-11-26', service_type: 'Плановое ТО-2', description: 'Замена масла и фильтров', cost: 42000, mileage_at_service: 209300, status: 'scheduled' },
  ];
  const fuel: FuelExpense[] = [
    { id: 1, order_id: 1, vehicle_id: 1, liters: 210, price_per_liter: 67.2, total_amount: 14112, station: 'АЗС Газпромнефть (М-1)', recorded_at: '2026-11-23 10:15:00' },
    { id: 2, order_id: 2, vehicle_id: 2, liters: 185, price_per_liter: 68.0, total_amount: 12580, station: 'АЗС Лукойл (М-11)', recorded_at: '2026-11-23 13:40:00' },
  ];
  return { clients, drivers, vehicles, orders, events, maintenance, fuel };
}

function getDB(): LocalDB {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw) as LocalDB; } catch {}
  const seed = buildSeedDB(); saveDB(seed); return seed;
}
function saveDB(db: LocalDB) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch {} }
function enrichOrder(db: LocalDB, o: Order): Order {
  const c = db.clients.find((x) => x.id === o.client_id), v = db.vehicles.find((x) => x.id === o.vehicle_id), d = db.drivers.find((x) => x.id === o.driver_id);
  return { ...o, client_name: c?.name, client_phone: c?.phone, client_inn: c?.inn, client_address: c?.address, client_contact: c?.contact_person, client_contract: c?.contract_number, client_discount: c?.discount_percent, plate_number: v?.plate_number || null, brand_model: v?.brand_model || null, vehicle_body_type: v?.body_type || null, vehicle_capacity: v?.capacity_tons || null, vehicle_volume: v?.volume_m3 || null, driver_name: d?.full_name || null, driver_phone: d?.phone || null, driver_license: d?.license_number || null };
}
function releaseResources(db: LocalDB, order: Order) {
  if (order.vehicle_id && !db.orders.some((o) => o.id !== order.id && o.vehicle_id === order.vehicle_id && ['assigned', 'loading', 'in_transit', 'delivered'].includes(o.status))) {
    const v = db.vehicles.find((x) => x.id === order.vehicle_id); if (v && v.status !== 'maintenance') v.status = 'free';
  }
  if (order.driver_id && !db.orders.some((o) => o.id !== order.id && o.driver_id === order.driver_id && ['assigned', 'loading', 'in_transit', 'delivered'].includes(o.status))) {
    const d = db.drivers.find((x) => x.id === order.driver_id); if (d && d.status === 'on_route') d.status = 'available';
  }
}

export const localEngine = {
  getDashboard(): DashboardData {
    const db = getDB(), enriched = db.orders.map((o) => enrichOrder(db, o)), nonCancelled = enriched.filter((o) => o.status !== 'cancelled');
    const totalRevenue = nonCancelled.reduce((s, o) => s + o.total_cost, 0), totalMargin = nonCancelled.reduce((s, o) => s + o.margin_est, 0);
    const paidRevenue = nonCancelled.filter((o) => o.payment_status === 'paid').reduce((s, o) => s + o.total_cost, 0);
    const busyVehicles = db.vehicles.filter((v) => v.status === 'in_transit').length, totalVehicles = db.vehicles.length;
    const monthNames: Record<string, string> = { '08': 'Авг', '09': 'Сен', '10': 'Окт', '11': 'Ноя' };
    const monthlyDynamics = ['08', '09', '10', '11'].map((m) => {
      const items = nonCancelled.filter((o) => (o.planned_departure || o.created_at).slice(5, 7) === m);
      const revenue = items.reduce((s, o) => s + Math.round(o.total_cost), 0), profit = items.reduce((s, o) => s + Math.round(o.margin_est), 0);
      return { month: monthNames[m], revenue, profit, expenses: Math.max(0, revenue - profit), trips: items.length };
    });
    const statusLabels: Record<string, string> = { new: 'Новые', assigned: 'Назначены', loading: 'Погрузка', in_transit: 'В пути', delivered: 'Доставлены', completed: 'Завершены', cancelled: 'Отменены' };
    const statusCounts = Object.keys(statusLabels).map((st) => ({ status: st, name: statusLabels[st], count: enriched.filter((o) => o.status === st).length })).filter((x) => x.count > 0);
    const clientMap = new Map<string, { name: string; orders: number; revenue: number }>();
    for (const o of nonCancelled) { const k = o.client_name || 'Клиент'; const p = clientMap.get(k) || { name: k, orders: 0, revenue: 0 }; p.orders += 1; p.revenue += o.total_cost; clientMap.set(k, p); }
    return {
      kpis: { totalRevenue, paidRevenue, totalMargin, marginPercent: totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 1000) / 10 : 0, activeTripsCount: enriched.filter((o) => ['assigned', 'loading', 'in_transit', 'delivered'].includes(o.status)).length, newOrdersCount: enriched.filter((o) => o.status === 'new').length, completedCount: enriched.filter((o) => o.status === 'completed').length, totalOrders: enriched.length, totalDistance: nonCancelled.reduce((s, o) => s + o.distance_km, 0), fleetUtilization: totalVehicles > 0 ? Math.round((busyVehicles / totalVehicles) * 100) : 0, totalVehicles, busyVehicles, maintVehicles: db.vehicles.filter((v) => v.status === 'maintenance').length, availableDrivers: db.drivers.filter((d) => d.status === 'available').length, totalDrivers: db.drivers.length, maintCostTotal: db.maintenance.reduce((s, m) => s + m.cost, 0), fuelCostTotal: db.fuel.reduce((s, f) => s + f.total_amount, 0) },
      monthlyDynamics, statusCounts, topClients: Array.from(clientMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      activeTrips: enriched.filter((o) => ['assigned', 'loading', 'in_transit'].includes(o.status)), serviceAlerts: db.vehicles.filter((v) => v.status === 'maintenance' || v.next_service_km - v.mileage_km <= 8000),
    };
  },
  getOrders(params?: { status?: string; search?: string }): Order[] {
    const db = getDB(); let list = db.orders.map((o) => enrichOrder(db, o)).sort((a, b) => b.id - a.id);
    if (params?.status && params.status !== 'all') list = list.filter((o) => o.status === params.status);
    if (params?.search) { const q = params.search.trim().toLowerCase(); list = list.filter((o) => o.order_number.toLowerCase().includes(q) || o.cargo_name.toLowerCase().includes(q) || o.origin_city.toLowerCase().includes(q) || o.destination_city.toLowerCase().includes(q) || (o.client_name || '').toLowerCase().includes(q)); }
    return list;
  },
  getOrder(id: number): Order {
    const db = getDB(), o = db.orders.find((x) => x.id === id); if (!o) throw new Error('Заявка не найдена');
    return { ...enrichOrder(db, o), events: db.events.filter((e) => e.order_id === id), fuelExpenses: db.fuel.filter((f) => f.order_id === id).map((f) => ({ ...f, plate_number: db.vehicles.find((v) => v.id === f.vehicle_id)?.plate_number })) };
  },
  calculateTariff(payload: Record<string, unknown>): TariffCalculation {
    const db = getDB(); let discountPercent = Number(payload.discountPercent || 0);
    if (payload.clientId) { const c = db.clients.find((x) => x.id === Number(payload.clientId)); if (c) discountPercent = c.discount_percent; }
    return calculateTariffLocal({ bodyType: payload.bodyType as BodyType, distanceKm: Number(payload.distanceKm), weightTons: Number(payload.weightTons), isUrgent: Boolean(payload.isUrgent), isAdr: Boolean(payload.isAdr), hasInsurance: Boolean(payload.hasInsurance), loadingHours: Number(payload.loadingHours ?? 2), discountPercent });
  },
  createOrder(b: Record<string, unknown>): Order {
    const db = getDB(), client = db.clients.find((c) => c.id === Number(b.client_id)) || db.clients[0];
    const nextId = Math.max(0, ...db.orders.map((o) => o.id)) + 1, bodyType = (b.body_type_required as BodyType) || 'tent';
    const calc = calculateTariffLocal({ bodyType, distanceKm: Number(b.distance_km || 500), weightTons: Number(b.weight_tons || 10), isUrgent: Boolean(b.is_urgent), isAdr: Boolean(b.is_adr), hasInsurance: Boolean(b.has_insurance), loadingHours: Number(b.loading_hours ?? 2), discountPercent: client?.discount_percent || 0 });
    const hasAssigned = Boolean(b.vehicle_id && b.driver_id), nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const newOrder: Order = { id: nextId, order_number: `ТР-2026-${200 + nextId}`, client_id: client.id, vehicle_id: b.vehicle_id ? Number(b.vehicle_id) : null, driver_id: b.driver_id ? Number(b.driver_id) : null, cargo_name: String(b.cargo_name || ''), cargo_category: String(b.cargo_category || 'Паллетный груз'), weight_tons: Number(b.weight_tons || 10), volume_m3: Number(b.volume_m3 || 40), body_type_required: bodyType, origin_city: String(b.origin_city || 'Москва'), origin_address: String(b.origin_address || 'Терминал'), destination_city: String(b.destination_city || 'Минск'), destination_address: String(b.destination_address || 'Склад'), distance_km: Number(b.distance_km || 500), planned_departure: String(b.planned_departure || '2026-11-24 09:00'), planned_arrival: String(b.planned_arrival || '2026-11-25 18:00'), actual_arrival: null, status: hasAssigned ? 'assigned' : 'new', progress_percent: hasAssigned ? 10 : 0, base_cost: calc.baseCost, additional_services_cost: calc.additionalServicesCost, total_cost: calc.totalCost, fuel_cost_est: calc.fuelCostEst, margin_est: calc.marginEst, payment_status: 'unpaid', is_urgent: b.is_urgent ? 1 : 0, is_adr: b.is_adr ? 1 : 0, has_insurance: b.has_insurance ? 1 : 0, notes: String(b.notes || ''), created_at: nowStr };
    db.orders.push(newOrder); db.events.push({ id: Math.max(0, ...db.events.map((e) => e.id)) + 1, order_id: nextId, status: 'new', location: newOrder.origin_city, comment: `Создана заявка от ${client.name}`, created_at: nowStr });
    saveDB(db); return enrichOrder(db, newOrder);
  },
  assignOrder(id: number, vehicleId: number, driverId: number): Order {
    const db = getDB(), order = db.orders.find((o) => o.id === id), vehicle = db.vehicles.find((v) => v.id === vehicleId), driver = db.drivers.find((d) => d.id === driverId);
    if (!order || !vehicle || !driver) throw new Error('Данные не найдены');
    if (vehicle.capacity_tons < order.weight_tons) throw new Error(`Грузоподъёмность ТС (${vehicle.capacity_tons} т) меньше веса груза (${order.weight_tons} т)`);
    if (vehicle.status === 'maintenance') throw new Error(`ТС ${vehicle.plate_number} находится на ТО / ремонте`);
    if (driver.status === 'vacation' || driver.status === 'sick') throw new Error(`Водитель ${driver.full_name} недоступен`);
    if (order.is_adr && !/ADR/i.test(driver.license_categories || '')) throw new Error(`У водителя ${driver.full_name} нет допуска ADR`);
    releaseResources(db, order); order.vehicle_id = vehicleId; order.driver_id = driverId;
    if (order.status === 'new') { order.status = 'assigned'; order.progress_percent = 10; }
    vehicle.status = 'in_transit'; driver.status = 'on_route';
    db.events.push({ id: Math.max(0, ...db.events.map((e) => e.id)) + 1, order_id: id, status: order.status, location: order.origin_city, comment: `Назначен ${vehicle.brand_model} (${vehicle.plate_number}), водитель: ${driver.full_name}`, created_at: new Date().toISOString().slice(0, 19).replace('T', ' ') });
    saveDB(db); return enrichOrder(db, order);
  },
  updateOrderStatus(id: number, payload: { status: string; location?: string; comment?: string; progress_percent?: number }): Order {
    const db = getDB(), order = db.orders.find((o) => o.id === id); if (!order) throw new Error('Заявка не найдена');
    const st = payload.status as OrderStatus; order.status = st; order.progress_percent = payload.progress_percent !== undefined ? payload.progress_percent : STATUS_PROGRESS[st];
    if (st === 'completed' || st === 'delivered') order.actual_arrival = new Date().toISOString().slice(0, 16).replace('T', ' ');
    if (st === 'completed' || st === 'cancelled') { releaseResources(db, order); if (st === 'completed' && order.vehicle_id) { const v = db.vehicles.find((x) => x.id === order.vehicle_id); if (v) v.mileage_km += order.distance_km; } }
    db.events.push({ id: Math.max(0, ...db.events.map((e) => e.id)) + 1, order_id: id, status: st, location: payload.location || order.destination_city, comment: payload.comment || `Статус: ${st}`, created_at: new Date().toISOString().slice(0, 19).replace('T', ' ') });
    saveDB(db); return enrichOrder(db, order);
  },
  saveOrderPod(id: number, payload: { signer: string; signature: string; seal_ok: boolean }): Order {
    const db = getDB(), order = db.orders.find((o) => o.id === id); if (!order) throw new Error('Заявка не найдена');
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    order.pod_signer = payload.signer.trim(); order.pod_signature = payload.signature; order.pod_timestamp = nowStr; order.pod_seal_ok = payload.seal_ok ? 1 : 0;
    db.events.push({ id: Math.max(0, ...db.events.map((e) => e.id)) + 1, order_id: id, status: order.status, location: order.destination_city, comment: `Цифровая подпись (ePOD): ${payload.signer.trim()}`, created_at: nowStr });
    saveDB(db); return enrichOrder(db, order);
  },
  patchOrder(id: number, payload: Record<string, unknown>): Order {
    const db = getDB(), order = db.orders.find((o) => o.id === id); if (!order) throw new Error('Заявка не найдена');
    if (payload.payment_status) order.payment_status = payload.payment_status as Order['payment_status'];
    if (payload.notes !== undefined) order.notes = String(payload.notes);
    saveDB(db); return enrichOrder(db, order);
  },
  deleteOrder(id: number) { const db = getDB(), order = db.orders.find((o) => o.id === id); if (order) releaseResources(db, order); db.orders = db.orders.filter((o) => o.id !== id); saveDB(db); return { deleted: true }; },
  getVehicles(): Vehicle[] { const db = getDB(); return db.vehicles.map((v) => ({ ...v, active_order_number: db.orders.find((o) => o.vehicle_id === v.id && ['assigned', 'loading', 'in_transit', 'delivered'].includes(o.status))?.order_number || null })).sort((a, b) => b.id - a.id); },
  createVehicle(b: Record<string, unknown>): Vehicle { const db = getDB(), v: Vehicle = { id: Math.max(0, ...db.vehicles.map((x) => x.id)) + 1, plate_number: String(b.plate_number || ''), brand_model: String(b.brand_model || ''), body_type: (b.body_type as BodyType) || 'tent', capacity_tons: Number(b.capacity_tons || 20), volume_m3: Number(b.volume_m3 || 86), fuel_consumption: Number(b.fuel_consumption || 32), mileage_km: Number(b.mileage_km || 0), next_service_km: Number(b.next_service_km || 20000), year: Number(b.year || 2024), status: 'free' }; db.vehicles.push(v); saveDB(db); return v; },
  updateVehicle(id: number, b: Record<string, unknown>): Vehicle { const db = getDB(), v = db.vehicles.find((x) => x.id === id); if (!v) throw new Error('ТС не найдено'); Object.assign(v, b); saveDB(db); return v; },
  deleteVehicle(id: number) { const db = getDB(); db.vehicles = db.vehicles.filter((v) => v.id !== id); saveDB(db); return { deleted: true }; },
  getMaintenance(): MaintenanceLog[] { const db = getDB(); return db.maintenance.map((m) => { const v = db.vehicles.find((x) => x.id === m.vehicle_id); return { ...m, plate_number: v?.plate_number, brand_model: v?.brand_model }; }).sort((a, b) => b.id - a.id); },
  createMaintenance(b: Record<string, unknown>): MaintenanceLog { const db = getDB(), v = db.vehicles.find((x) => x.id === Number(b.vehicle_id)); if (!v) throw new Error('ТС не найдено'); const st = (b.status as MaintenanceLog['status']) || 'scheduled', item: MaintenanceLog = { id: Math.max(0, ...db.maintenance.map((m) => m.id)) + 1, vehicle_id: v.id, service_date: String(b.service_date || new Date().toISOString().slice(0, 10)), service_type: String(b.service_type || ''), description: String(b.description || ''), cost: Number(b.cost || 0), mileage_at_service: v.mileage_km, status: st }; db.maintenance.push(item); if (st === 'in_progress') v.status = 'maintenance'; saveDB(db); return item; },
  updateMaintenanceStatus(id: number, status: string): MaintenanceLog { const db = getDB(), m = db.maintenance.find((x) => x.id === id); if (!m) throw new Error('Не найдено'); m.status = status as MaintenanceLog['status']; const v = db.vehicles.find((x) => x.id === m.vehicle_id); if (v && status === 'done') { v.status = 'free'; v.next_service_km = v.mileage_km + 20000; } saveDB(db); return m; },
  getDrivers(): Driver[] { const db = getDB(); return db.drivers.map((d) => ({ ...d, completed_trips: db.orders.filter((o) => o.driver_id === d.id && o.status === 'completed').length, active_order_number: db.orders.find((o) => o.driver_id === d.id && ['assigned', 'loading', 'in_transit', 'delivered'].includes(o.status))?.order_number || null })).sort((a, b) => b.id - a.id); },
  createDriver(b: Record<string, unknown>): Driver { const db = getDB(), d: Driver = { id: Math.max(0, ...db.drivers.map((x) => x.id)) + 1, full_name: String(b.full_name || ''), phone: String(b.phone || ''), license_number: String(b.license_number || ''), license_categories: String(b.license_categories || 'C, CE'), medical_cert_until: String(b.medical_cert_until || '2027-12-31'), experience_years: Number(b.experience_years || 5), status: 'available', rating: 4.85 }; db.drivers.push(d); saveDB(db); return d; },
  updateDriver(id: number, b: Record<string, unknown>): Driver { const db = getDB(), d = db.drivers.find((x) => x.id === id); if (!d) throw new Error('Водитель не найден'); Object.assign(d, b); saveDB(db); return d; },
  deleteDriver(id: number) { const db = getDB(); db.drivers = db.drivers.filter((d) => d.id !== id); saveDB(db); return { deleted: true }; },
  getClients(): Client[] { const db = getDB(); return db.clients.map((c) => { const co = db.orders.filter((o) => o.client_id === c.id && o.status !== 'cancelled'); return { ...c, orders_count: co.length, total_revenue: co.reduce((s, o) => s + o.total_cost, 0) }; }).sort((a, b) => b.id - a.id); },
  createClient(b: Record<string, unknown>): Client { const db = getDB(), c: Client = { id: Math.max(0, ...db.clients.map((x) => x.id)) + 1, name: String(b.name || ''), inn: String(b.inn || ''), contact_person: String(b.contact_person || ''), phone: String(b.phone || ''), email: String(b.email || ''), address: String(b.address || ''), contract_number: String(b.contract_number || 'ДГ-2026/100'), discount_percent: Number(b.discount_percent || 0), created_at: new Date().toISOString().slice(0, 10) }; db.clients.push(c); saveDB(db); return c; },
  updateClient(id: number, b: Record<string, unknown>): Client { const db = getDB(), c = db.clients.find((x) => x.id === id); if (!c) throw new Error('Клиент не найден'); Object.assign(c, b); saveDB(db); return c; },
  deleteClient(id: number) { const db = getDB(); if (db.orders.some((o) => o.client_id === id)) throw new Error('Нельзя удалить клиента с заявками'); db.clients = db.clients.filter((c) => c.id !== id); saveDB(db); return { deleted: true }; },
  getFuel(): FuelExpense[] { const db = getDB(); return db.fuel.map((f) => { const v = db.vehicles.find((x) => x.id === f.vehicle_id), o = db.orders.find((x) => x.id === f.order_id); return { ...f, plate_number: v?.plate_number, brand_model: v?.brand_model, order_number: o?.order_number || null }; }).sort((a, b) => b.id - a.id); },
  createFuel(b: Record<string, unknown>): FuelExpense { const db = getDB(), liters = Number(b.liters || 0), price = Number(b.price_per_liter || 67.5), f: FuelExpense = { id: Math.max(0, ...db.fuel.map((x) => x.id)) + 1, order_id: b.order_id ? Number(b.order_id) : null, vehicle_id: Number(b.vehicle_id), liters, price_per_liter: price, total_amount: Math.round(liters * price), station: String(b.station || 'АЗС'), recorded_at: new Date().toISOString().slice(0, 19).replace('T', ' ') }; db.fuel.push(f); saveDB(db); return f; },
  resetDemo() { saveDB(buildSeedDB()); return { ok: true }; },
};
