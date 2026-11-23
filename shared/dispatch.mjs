// Business rules shared by the API, portable app and assignment forms.
export const ACTIVE_STATUSES = ['assigned', 'loading', 'in_transit', 'delivered'];
const TRANSITIONS = {
  new: ['assigned', 'cancelled'],
  assigned: ['loading', 'in_transit', 'cancelled'],
  loading: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'completed', 'cancelled'],
  delivered: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function vehicleIssue(order, vehicle, orders = []) {
  if (!vehicle) return 'Транспортное средство не найдено';
  if (vehicle.status === 'maintenance') return 'ТС находится на ТО / ремонте';
  if ((vehicle.active_order_number && vehicle.active_order_number !== order.order_number) ||
      orders.some((o) => o.id !== order.id && o.vehicle_id === vehicle.id && ACTIVE_STATUSES.includes(o.status)) ||
      (vehicle.status !== 'free' && vehicle.id !== order.vehicle_id)) return 'ТС уже занято другим рейсом';
  if (vehicle.body_type !== order.body_type_required) return 'Тип кузова не соответствует требованиям груза';
  if (vehicle.capacity_tons < order.weight_tons) return 'Недостаточная грузоподъёмность ТС';
  if (vehicle.volume_m3 < order.volume_m3) return 'Объём груза превышает вместимость ТС';
  return null;
}

export function driverIssue(order, driver, orders = [], now = new Date()) {
  if (!driver) return 'Водитель не найден';
  if (['vacation', 'sick'].includes(driver.status)) return 'Водитель в отпуске или на больничном';
  if ((driver.active_order_number && driver.active_order_number !== order.order_number) ||
      orders.some((o) => o.id !== order.id && o.driver_id === driver.id && ACTIVE_STATUSES.includes(o.status)) ||
      (driver.status !== 'available' && driver.id !== order.driver_id)) return 'Водитель уже занят другим рейсом';
  if (order.is_adr && !/ADR/i.test(driver.license_categories || '')) return 'У водителя нет допуска ADR';
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(driver.medical_cert_until || '') || driver.medical_cert_until < today) {
    return 'Медсправка водителя отсутствует или просрочена';
  }
  return null;
}

export function transitionIssue(order, status) {
  if (!Object.hasOwn(TRANSITIONS, status)) return 'Некорректный статус рейса';
  if (order.status !== status && !TRANSITIONS[order.status]?.includes(status)) return 'Недопустимый переход статуса рейса';
  if (ACTIVE_STATUSES.includes(status) && (!order.vehicle_id || !order.driver_id)) return 'Сначала назначьте ТС и водителя';
  return null;
}

export function orderInputIssue(b) {
  if (!Number.isInteger(Number(b.client_id)) || Number(b.client_id) <= 0 ||
      ['cargo_name', 'origin_city', 'destination_city'].some((key) => typeof b[key] !== 'string' || !b[key].trim())) {
    return 'Заполните клиента, наименование груза и маршрут';
  }
  for (const [key, label] of [['weight_tons', 'Вес'], ['volume_m3', 'Объём'], ['distance_km', 'Расстояние']]) {
    if (!Number.isFinite(Number(b[key])) || Number(b[key]) <= 0) return `${label} должен быть больше нуля`;
  }
  if (!['tent', 'ref', 'isotherm', 'flatbed', 'container', 'tank'].includes(b.body_type_required)) return 'Выберите тип кузова';
  const departure = new Date(String(b.planned_departure).replace(' ', 'T')).getTime();
  const arrival = new Date(String(b.planned_arrival).replace(' ', 'T')).getTime();
  if (!Number.isFinite(departure) || !Number.isFinite(arrival)) return 'Укажите корректные даты отправления и прибытия';
  if (arrival <= departure) return 'Прибытие должно быть позже отправления';
  if (b.loading_hours !== undefined && (!Number.isFinite(Number(b.loading_hours)) || Number(b.loading_hours) < 0)) return 'Время погрузки не может быть отрицательным';
  if (Boolean(b.vehicle_id) !== Boolean(b.driver_id)) return 'Назначьте ТС и водителя вместе или оставьте оба поля пустыми';
  return null;
}

export function isOverdue(order, now = new Date()) {
  return ['new', 'assigned', 'loading', 'in_transit'].includes(order.status) &&
    new Date(order.planned_arrival.replace(' ', 'T')).getTime() < now.getTime();
}

export function monthlyDynamics(orders, now = new Date()) {
  const months = new Map();
  for (let offset = 5; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.set(key, { month: date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }), revenue: 0, expenses: 0, profit: 0, trips: 0 });
  }
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const bucket = months.get((order.planned_departure || order.created_at || '').slice(0, 7));
    if (!bucket) continue;
    const revenue = Math.round(Number(order.total_cost) || 0);
    const profit = Math.round(Number(order.margin_est) || 0);
    bucket.revenue += revenue;
    bucket.profit += profit;
    bucket.expenses += Math.max(0, revenue - profit);
    bucket.trips++;
  }
  return [...months.values()];
}
